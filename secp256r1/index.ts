import path from 'path';
import { writeFileSync } from 'fs';
import { default as elliptic } from 'elliptic';
import bn from "bn.js";
import { pointToString, bigIntToBytesLE, buildPrecomputedTable, multiScalarMulInterleavedWithTable } from './utils.ts';
import { AffinePoint } from '../curves/point.ts';
import { Secp256r1Curve } from '../curves/secp256r1.ts';
import { mod, modInverse } from '../curves/util.ts';
import { sign } from 'crypto';
const EC = elliptic.ec;
const ec = new EC('p256');
const __dirname = import.meta.dirname;
const curve = new Secp256r1Curve();

async function createTemplate(data:any) {
    const { default: template } = await import("./transaction/template.json", { with: { type: "json" } });

    template.scenarios["base"] = {
        ...template.scenarios["base"],
        data: {
          bytecode: {
            table_q: `<0x${data.table_q}>`,
            table_q_hash: `<0x${data.table_q_hash}>`,
            table_g: `<0x${data.table_g}>`,
            table_g_hash: `<0x${data.table_g_hash}>`,
            signature_der: `<0x${data.signature_der}>`,
            signature_r: `<${data.signature_r}>`,
            u1: `<${data.u1}>`,
            u2: `<${data.u2}>`,
            inverse_s: `<${data.inverse_s}>`,
            msm_inverses: `<0x${data.msm_inverses}>`,
            continuation_index: `<${data.continuation_index}>`,
            continuation_intermediate_x: `<${data.continuation_intermediate_x}>`,
            continuation_intermediate_y: `<${data.continuation_intermediate_y}>`,
            continuation_msm_inverses: `<0x${data.continuation_msm_inverses}>`,
          }
        }
    };

    return template;
}

export async function createSecp256r1Template(privateKeyStr:string, msgHashStr:string) {
  
  function hexToBigInt(hexStr: string) {
    if (hexStr.startsWith('0x') || hexStr.startsWith('0X')) {
      hexStr = hexStr.slice(2);
    }
    return BigInt('0x' + hexStr);
  }

  function ecPointToInternalAffinePoint(ecPoint: any) {
      return new AffinePoint(
          hexToBigInt(ecPoint.getX().toString(16)),
          hexToBigInt(ecPoint.getY().toString(16))
      );
  }
  
  //Create keys using ec library and convert to internal format
  const rawPrivateKey = Buffer.from(BigInt(privateKeyStr).toString(16), 'hex');
  const privateKey = ec.keyFromPrivate(rawPrivateKey, 'hex');
  const publicKey = Buffer.from(privateKey.getPublic(true, 'hex'), 'hex');
  const publicKeyPoint = ecPointToInternalAffinePoint(privateKey.getPublic())

  //Sign message using library
  const msgHash = Buffer.from(msgHashStr, 'hex');
  const signature  = ec.sign(new bn.BN(msgHash), rawPrivateKey, { canonical: true });
  const signatureBuffer = Buffer.from(signature.toDER());
  const s = BigInt("0x" + signature.s.toString(16));
  const r = BigInt("0x" + signature.r.toString(16));
  const z = BigInt('0x' + msgHash.toString('hex'));
  // s−1≡ w(modn)
  const w = modInverse(s, curve.n);
  // u1 ≡ z*w(modn)
  const u1 = mod(z * w, curve.n);
  // u2 ≡ r*w (modn)
  const u2 = mod(r * w, curve.n);
  // (X,Y)=u1​⋅G + u2​⋅Q
  const point = ec.g.mul(new bn.BN(u1)).add(privateKey.getPublic().mul(new bn.BN(u2)));
  const x = mod(BigInt("0x" + point.getX().toString(16)), curve.n);

  if (x !== r) {
      throw new Error('Signature verification failed');
  }

  //Create precomputed tables and other data for affine scalar multiplication verfication (usage with script)
  const windowSize = 4;
  const maxPoints = Math.pow(2, windowSize) - 1;
  
  const g = curve.createAffineGenerator();
  const table_g = buildPrecomputedTable(g, maxPoints).map(pt => pointToString(pt)).join('');
  const table_g_hash = Buffer.from(await crypto.subtle.digest("sha-256", Buffer.from(table_g, 'hex'))).toString('hex');
  
  const q = publicKeyPoint;
  const table_q = buildPrecomputedTable(q, maxPoints).map(pt => pointToString(pt)).join('');
  const table_q_hash = Buffer.from(await crypto.subtle.digest("sha-256", Buffer.from(table_q, 'hex'))).toString('hex');

  const { inverses: msm_inverses, end, result: continuation_intermediate } = multiScalarMulInterleavedWithTable({ point: g, scalar: u1}, { point: q, scalar: u2 }, windowSize, { end: 33, result: AffinePoint.infinity() }, false);
  const continuation = { start: end - 1, end: 0, result: continuation_intermediate };
  const { inverses: continuation_msm_inverses, result: final_result } = multiScalarMulInterleavedWithTable({ point: g, scalar: u1}, { point: q, scalar: u2 }, windowSize, continuation, false);
  
  console.log({ r, s, z, w, u1, u2, final_result });
  const template = await createTemplate({
    table_q,
    table_q_hash,
    table_g,
    table_g_hash,
    signature_der: Buffer.concat([signatureBuffer, Buffer.from("63", "hex")]).toString('hex'),
    signature_r: r,
    inverse_s: w,
    u1,
    u2,
    msm_inverses: msm_inverses.map(i => bigIntToBytesLE(i, 32).toString('hex')).join(''),
    continuation_index: continuation.start,
    continuation_intermediate_x: continuation_intermediate.x,
    continuation_intermediate_y: continuation_intermediate.y,
    continuation_msm_inverses: continuation_msm_inverses.map(i => bigIntToBytesLE(i, 32).toString('hex')).join(''),
  });

  writeFileSync(
      path.join(__dirname + '/transaction/dynamic_transaction_secp256r1.json'), 
      JSON.stringify(template, null, 4)
  );
}