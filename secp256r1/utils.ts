import { bigIntToVmNumber } from "@bitauth/libauth";
import { Curve } from "../curves/curve.ts";
import { JacobianPoint, AffinePoint } from "../curves/point.ts";
import { mod } from "../curves/util.ts";
import bn from "bn.js";
import { default as elliptic } from 'elliptic';
import { Secp256r1Curve } from "../curves/secp256r1.ts";
const EC = elliptic.ec;
const ec = new EC('p256');

function bitLengthVmNuberFromBigInt(k:bigint) {
  return bigIntToVmNumber(BigInt(k)).length * 8;
}

function getWindow(windowSize: number, kAbs:bigint, windowIndex: number) {
  const shift = BigInt(windowSize) * BigInt(windowIndex);
  return Number((kAbs >> shift) & BigInt(Math.pow(2, windowSize) - 1));
}


/**
 * Convert BigInt to fixed-size byte buffer (little-endian)
 */
export function bigIntToBytesLE(bigint: bigint, byteLength:number) {    
    const hex = bigint.toString(16).padStart(byteLength * 2, '0');
    const buffer = Buffer.from(hex, 'hex');
    const leBuffer = buffer.reverse();
    
    // ALWAYS add sign byte for predictable length
    return Buffer.concat([leBuffer, Buffer.from([0x00])]);
}

export function pointToString(point: AffinePoint) {
    return Buffer.concat([
        bigIntToBytesLE(point.x, 32),
        bigIntToBytesLE(point.y, 32)
    ]).toString('hex')
}

export function buildPrecomputedTable(point: JacobianPoint | AffinePoint, maxPoints = 1, odd = false, debug = false) {
    const p = point instanceof JacobianPoint ? curve.jacobianToAffine(point).result : point;
    const table:AffinePoint[] = new Array(maxPoints); // Indices 1-15, skip 0

    table[0] = p;
    
    // Build rest: table[i] = i*P
    for (let i = 1; i < maxPoints; i++) {
        table[i] = curve.addAffinePoints(table[i - 1], p).result;
    }

    return table;
}

const curve = new Secp256r1Curve();

type MSMCompontent = { point: AffinePoint, scalar: bigint };
export function multiScalarMulInterleavedWithTable(aP:MSMCompontent, bQ:MSMCompontent, windowSize = 4, continuation: {start?:number, end:number, result: AffinePoint} | undefined = undefined, verbose = false) : { result: AffinePoint, inverses: bigint[], end: number } {
  const inverses:bigint[] = []
  
  let p = aP.point,
    a = aP.scalar,
    q = bQ.point,
    b = bQ.scalar;

  a = mod(a, curve.n);
  b = mod(b, curve.n);
  if ((a === 0n || p.isInfinity) && (b === 0n || q.isInfinity)) return { result: AffinePoint.infinity(), inverses, end: 0 };

  const table1 = buildPrecomputedTable(p, Math.pow(2, windowSize) - 1);
  const table2 = buildPrecomputedTable(q, Math.pow(2, windowSize) - 1);

  const nW1 = Math.ceil(bitLengthVmNuberFromBigInt(a) / windowSize);
  const nW2 = Math.ceil(bitLengthVmNuberFromBigInt(b) / windowSize);
  const nW = Math.max(nW1, nW2);

  if (verbose) console.log('MSM components:', { windowSize, a, b, aBitLength: bitLengthVmNuberFromBigInt(a), bBitLength: bitLengthVmNuberFromBigInt(b), nW1, nW2, nW, p, q });

  let R = continuation && continuation.result ? continuation.result : AffinePoint.infinity(),
      start = continuation && continuation.start ? continuation.start : nW - 1,
      end = continuation && continuation.end ? continuation.end : 0;

  if (verbose) console.log('Starting MSM with table multiplication');

  for (let i = start; i >= end; i--) {
    for (let j = 0; j < windowSize; j++) {
      const { result, inverse } = curve.doubleAffinePoint(R);
      inverses.push(inverse ?? 0n);
      if (verbose) console.log("doubling", i, R, "result:\n", result, "\n inverse", inverse);
      R = result;
    }

    if (verbose) console.log("doubling result:\n", R, "\n");

    if (i < nW1) {
      const w1 = getWindow(windowSize, a, i);
      if (w1 !== 0) {
        const T1 = table1[w1 - 1];
        const { result, inverse } = curve.addAffinePoints(R, T1);
        inverses.push(inverse ?? 0n);
        if (verbose) console.log({ name: "a:", i, w1, T1: T1, previousR: R, newR: result, inverse });
        R = result;
      }
    }

    if (i < nW2) {
      const w2 = getWindow(windowSize, b, i);
      if (w2 !== 0) {
        const T2 = table2[w2 - 1];
        const { result, inverse } = curve.addAffinePoints(R, T2);
        inverses.push(inverse ?? 0n);
        if (verbose) console.log({ name: "b:", i, w2, T2: T2, previousR: R, newR: result, inverse });
        R = result;
      }
    }
  }

  if (verbose) console.log('Interleaved results:', { R });

  if (end == 0) {
    const expected = canonicalMSM(p, a, q, b);
    if (!R.equals(expected)) {
      throw new Error(`Scalar mismatch in MSM: expected ${expected.x}, ${expected.y}, got ${R.x}, ${R.y}`);
    }
  }

  return { 
    result: R, 
    inverses, 
    end: end
  };
}

export function compareCanonicalAdd(p:AffinePoint, q: AffinePoint, actual: AffinePoint) {    
    const ecP = p.isInfinity ? ec.curve.point(null, null) : ec.curve.point(p.x.toString(16), p.y.toString(16));
    const ecQ = q.isInfinity ? ec.curve.point(null, null) : ec.curve.point(q.x.toString(16), q.y.toString(16));
    const result = ecP.add(ecQ);

    const expected = result.isInfinity() ?
        AffinePoint.infinity() : 
        new AffinePoint(
          BigInt("0x" + result.getX().toString(16)), 
          BigInt("0x" + result.getY().toString(16)),
          false
      );

    if (!expected.equals(actual)) {
        throw new Error(`Point addition mismatch: expected ${expected.toString()}, got ${actual.toString()}`);
    }
}

export function compareCanonicalDouble(p:AffinePoint, actual: AffinePoint) {    
    const ecP = p.isInfinity ? ec.curve.point(null, null) : ec.curve.point(p.x.toString(16), p.y.toString(16));
    const result = ecP.add(ecP);

    const expected = result.isInfinity() ?
        AffinePoint.infinity() :
        new AffinePoint(
          BigInt("0x" + result.getX().toString(16)), 
          BigInt("0x" + result.getY().toString(16)),
          false
      );

    if (!expected.equals(actual)) {
        throw new Error(`Point addition mismatch: expected ${expected.toString()}, got ${actual.toString()}`);
    }
}

export function canonicalMSM(p:AffinePoint, a: bigint, q: AffinePoint, b:bigint) {    
    const aBN = ec.keyFromPrivate(a.toString(16), "hex").getPrivate(); 
    const bBN = ec.keyFromPrivate(b.toString(16), "hex").getPrivate();

    const aP = ec.curve.point(p.x.toString(16), p.y.toString(16)).mul(aBN);
    const bQ = ec.curve.point(q.x.toString(16), q.y.toString(16)).mul(bBN);
    const result = aP.add(bQ);

    return new AffinePoint(
        BigInt("0x" + result.getX().toString(16)), 
        BigInt("0x" + result.getY().toString(16))
    );
}

export  function canonicalScalarMultiply(p:AffinePoint, scalar: bigint) {    
    
    scalar = ((scalar % curve.n) + curve.n) % curve.n;  // ✅ Always positive
    
    const result = ec.keyFromPublic({
        x: p.x.toString(16),
        y: p.y.toString(16)
    }).getPublic().mul(new bn.BN(scalar.toString(16), 16));

    return new AffinePoint(
        BigInt("0x" + result.getX().toString(16)), 
        BigInt("0x" + result.getY().toString(16))
    );
}