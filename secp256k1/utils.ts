import { bigIntToVmNumber } from "@bitauth/libauth";
import { Curve } from "../curves/curve.ts";
import { JacobianPoint, AffinePoint } from "../curves/point.ts";
import { mod } from "../curves/util.ts";
import bn from "bn.js";
import { default as elliptic } from 'elliptic';
import { Secp256k1Curve } from "../curves/secp256k1.ts";
const EC = elliptic.ec;
const ec = new EC('secp256k1');
const curve = new Secp256k1Curve();

const GLV_CONSTANTS = {
  // Curve order
  n: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
  
  // Field prime
  p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
  
  // Lambda: scalar such that ψ(P) = λ·P
  lambda: 0x5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72n,
  
  // Beta: field element such that ψ(x,y) = (β·x, y)
  beta: 0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501een,
  
  // Lattice basis vectors for scalar decomposition
  // These are precomputed constants from lattice reduction
  a1: 0x3086d221a7d46bcde86c90e49284eb15n,
  b1: -0xe4437ed6010e88286f547fa90abfe4c3n,
  a2: 0x114ca50f7a8e2f3f657c1108d9d44cfd8n,
  b2: 0x3086d221a7d46bcde86c90e49284eb15n,
};

function roundDiv(x:bigint, n:bigint) {
  if (x >= 0n) {
    return (x + (n >> 1n)) / n;
  } else {
    return (x - (n >> 1n)) / n;
  }
}

function splitScalarRaw(k:bigint) {
  const { n, lambda, a1, b1, a2, b2 } = GLV_CONSTANTS;

  // k should already be reduced mod N
  const kBig = mod(k, n);

  const c1 = roundDiv(b2 * kBig, n);
  const c2 = roundDiv(-b1 * kBig, n);

  const k1 = kBig - (c1 * a1 + c2 * a2);
  const k2 = -(c1 * b1 + c2 * b2);

  // Reduce to [0, N)
  const r2 = mod(k2, n);
  const r1 = mod(kBig - r2 * lambda, n);

  return { r1, r2 };
}

function phi(point: AffinePoint) {
  if (point.isInfinity) return point;
  return new AffinePoint(mod(GLV_CONSTANTS.beta * point.x, curve.p), point.y);
}

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

export function splitScalarSigned(k:bigint) {
  const N_HALF = GLV_CONSTANTS.n >> 1n;
  const { r1, r2 } = splitScalarRaw(k);
  let k1 = r1;
  let k2 = r2;
  if (k1 > N_HALF) k1 -= GLV_CONSTANTS.n;
  if (k2 > N_HALF) k2 -= GLV_CONSTANTS.n;
  return { k1, k2 };
}

export function buildPrecomputedTable(point: JacobianPoint | AffinePoint, maxPoints = 1, odd = false, debug = false) {
    const p = point instanceof JacobianPoint ? curve.jacobianToAffine(point).result : point;
    if (!odd) {
        const table:AffinePoint[] = new Array(maxPoints); // Indices 1-15, skip 0

        table[0] = p;
        
        // Build rest: table[i] = i*P
        for (let i = 1; i < maxPoints; i++) {
            table[i] = curve.addAffinePoints(table[i - 1], p).result;
        }

        return table;
    } else {
        const table:AffinePoint[] = new Array(Math.ceil(maxPoints / 2)); // Indices 0,2,4,...14
        
        table[0] = p;
        const doubleP = curve.doubleAffinePoint(p).result;
        
        // Build rest: table[i] = (2i+1)*P
        for (let i = 1; i < table.length; i++) {
            table[i] = curve.addAffinePoints(table[i - 1], doubleP).result;
        }

        return table;
    }
}

export function scalarMulGLVInterleavedJacWithTable(p: AffinePoint, k: bigint, windowSize = 4, verbose = false) : { result: AffinePoint, inverses: bigint[] } {
  const inverses:bigint[] = []
  const kReduced = mod(k, curve.n);
  if (kReduced === 0n || p.isInfinity) return { result: AffinePoint.infinity(), inverses };

  const { k1, k2 } = splitScalarSigned(kReduced);
  const sign1 = k1 < 0n ? -1 : 1;
  const sign2 = k2 < 0n ? -1 : 1;
  const k1Abs = k1 < 0n ? -k1 : k1;
  const k2Abs = k2 < 0n ? -k2 : k2;

  if (k1Abs === 0n && k2Abs === 0n) return { result: AffinePoint.infinity(), inverses };

  const P1 = p;
  const P2 = phi(p);

  const table1 = buildPrecomputedTable(P1, Math.pow(2, windowSize) - 1);
  const table2 = buildPrecomputedTable(P2, Math.pow(2, windowSize) - 1);

  // console.log('GLV Tables 1:');
  // console.table(table1.slice(1).map(pt => pointToString(jacToAffine(pt))))

  const nW1 = Math.ceil(bitLengthVmNuberFromBigInt(k1Abs) / windowSize);
  const nW2 = Math.ceil(bitLengthVmNuberFromBigInt(k2Abs) / windowSize);
  const nW = Math.max(nW1, nW2);
  if (verbose) console.log('Interleaved GLV split:', { windowSize, k, k1, k2, k1Abs, k2Abs, k1AbsBitLength: bitLengthVmNuberFromBigInt(k1Abs), k2AbsBitLength: bitLengthVmNuberFromBigInt(k2Abs), nW1, nW2, nW, P1, P2 });

  let R = AffinePoint.infinity();

  if (verbose) console.log('Starting interleaved GLV with table multiplication');


  for (let i = nW - 1; i >= 0; i--) {
    for (let j = 0; j < windowSize; j++) {
      const { result, inverse } = curve.doubleAffinePoint(R);
      inverses.push(inverse ?? 0n);
      if (verbose) console.log("doubling", i, R, "result:\n", result, "\n inverse", inverse);
      R = result;
    }

    if (verbose) console.log("doubling result:\n", R, "\n");

    if (i < nW1) {
      const w1 = getWindow(windowSize, k1Abs, i);
      if (w1 !== 0) {
        let T1 = table1[w1 - 1];
        if (sign1 < 0) T1 = curve.negateAffinePoint(T1);
        const { result, inverse } = curve.addAffinePoints(R, T1);
        inverses.push(inverse ?? 0n);
        if (verbose) console.log({ name: "k1:", i, w1, T1: T1, previousR: R, newR: result, inverse });
        R = result;
      }
    }

    if (i < nW2) {
      const w2 = getWindow(windowSize, k2Abs, i);
      if (w2 !== 0) {
        let T2 = table2[w2 - 1];
        if (sign2 < 0) T2 = curve.negateAffinePoint(T2);
        const { result, inverse } = curve.addAffinePoints(R, T2);
        inverses.push(inverse ?? 0n);
        if (verbose) console.log({ name: "k2:", i, w2, T2: T2, previousR: R, newR: result, inverse });
        R = result;
      }
    }
  }

  if (verbose) console.log('Interleaved GLV results before sign:', { R });

  const expected = canonicalScalarMultiply(p, k);
  if (!R.equals(expected)) {
    throw new Error(`Scalar mismatch in interleaved GLV: expected ${expected.x}, ${expected.y}, got ${R.x}, ${R.y}`);
  }

  return { result: R, inverses };
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