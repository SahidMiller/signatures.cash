import path from 'path';
import { writeFileSync } from 'fs';
import { secp256k1 } from '@bitauth/libauth';
import { default as elliptic } from 'elliptic';
import bn from "bn.js";
import { pointToString, bigIntToBytesLE, buildPrecomputedTable, splitScalarSigned, scalarMulGLVInterleavedJacWithTable } from './utils.ts';
import { AffinePoint } from '../curves/point.ts';
import { Secp256k1Curve } from '../curves/secp256k1.ts';
const EC = elliptic.ec;
const ec = new EC('secp256k1');
const __dirname = import.meta.dirname;

async function createTemplate(data:any) {
    const { default: template } = await import("./transaction/template.json", { with: { type: "json" } });

    template.scenarios["base"] = {
        ...template.scenarios["base"],
        data: {
          bytecode: {
            table_p: `<0x${data.table_p}>`,
            table_p_hash: `<0x${data.table_p_hash}>`,
            table_g: `<0x${data.table_g}>`,
            table_g_hash: `<0x${data.table_g_hash}>`,
            compressed_key: `<0x${data.compressed_key}>`,
            signature: `<0x${data.signature}>`,
            e_k1: `<${data.e_k2}>`,
            e_k2: `<${data.e_k1}>`,
            ep_inverses: `<0x${data.ep_inverses}>`,
            s_k1: `<${data.s_k2}>`,
            s_k2: `<${data.s_k1}>`,
            sg_inverses: `<0x${data.sg_inverses}>`,
            sg_plus_ep_inverse: `<${data.sg_plus_ep_inverse}>`,
            ep_result: `<0x${data.commitment}>`,
          }
        }
    };

    return template;
}

export async function createSecp256k1Template(privateKeyStr:string, msgHashStr:string) {
  
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
  const signature = Buffer.from(secp256k1.signMessageHashSchnorr(rawPrivateKey, msgHash));
  const r = signature.subarray(0, 32);
  const s = signature.subarray(32);
  const e = Buffer.from(await crypto.subtle.digest("sha-256", Buffer.concat([r, publicKey, msgHash])));
  console.log({ r: r.toString("hex"), s: s.toString("hex") });

  //Create intermediate points using library
  const sG = ec.g.mul(new bn.BN(s, 16));
  const eP = ec.keyFromPrivate(rawPrivateKey, 'hex').getPublic().mul(new bn.BN(e, 16));

  //Create precomputed tables and other data for affine scalar multiplication verfication (usage with script)
  const curve = new Secp256k1Curve();
  const windowSize = 4;
  const maxPoints = Math.pow(2, windowSize) - 1;
  const table_p = buildPrecomputedTable(publicKeyPoint, maxPoints).map(pt => pointToString(pt)).join('');
  const table_p_hash = Buffer.from(await crypto.subtle.digest("sha-256", Buffer.from(table_p, 'hex'))).toString('hex');
  const table_g = buildPrecomputedTable(curve.createAffineGenerator(), maxPoints).map(pt => pointToString(pt)).join('');
  const table_g_hash = Buffer.from(await crypto.subtle.digest("sha-256", Buffer.from(table_g, 'hex'))).toString('hex');
  const { k1: e_k1, k2: e_k2 } = splitScalarSigned(hexToBigInt(e.toString('hex')));
  const { k1: s_k1, k2: s_k2 } = splitScalarSigned(hexToBigInt(s.toString('hex')));
  const ep_inverses = scalarMulGLVInterleavedJacWithTable(publicKeyPoint, hexToBigInt(e.toString('hex')), windowSize).inverses;
  const sg_inverses = scalarMulGLVInterleavedJacWithTable(curve.createAffineGenerator(), hexToBigInt(s.toString('hex')), windowSize).inverses;
  const sgPoint = ecPointToInternalAffinePoint(sG);
  const epPoint = ecPointToInternalAffinePoint(eP);
  const sg_plus_ep_inverse = curve.addAffinePoints(curve.negateAffinePoint(epPoint), sgPoint).inverse;
  const commitment = 
    Buffer.concat([
      bigIntToBytesLE(hexToBigInt(eP.neg().getY().toString(16)), 32),
      bigIntToBytesLE(hexToBigInt(eP.neg().getX().toString(16)), 32),
    ]).toString('hex');

  const template = await createTemplate({
    table_p,
    table_p_hash,
    table_g,
    table_g_hash,
    compressed_key: publicKey.toString('hex'),
    signature: Buffer.concat([signature, Buffer.from("63", "hex")]).toString('hex'),
    e_k1,
    e_k2,
    ep_inverses: ep_inverses.map(pt => bigIntToBytesLE(pt, 32).toString('hex')).join(''),
    s_k1,
    s_k2,
    sg_inverses: sg_inverses.map(pt => bigIntToBytesLE(pt, 32).toString('hex')).join(''),
    sg_plus_ep_inverse,
    commitment
  });

  writeFileSync(
      path.join(__dirname + '/transaction/dynamic_transaction_secp256k1.json'), 
      JSON.stringify(template, null, 4)
  );
}