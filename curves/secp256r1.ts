import { Curve } from "./curve.ts";
import { JacobianPoint } from "./point.ts";
import { mod } from "./util.ts";

export class Secp256r1Curve extends Curve {
    public name = 'secp256r1';
    public p = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFn
    public n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551n
    public a = -3n
    public b = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604Bn
    public Gx = 0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296n
    public Gy = 0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5n
    public bits = 256;

    doubleJacobianPoint(p1: JacobianPoint): { result: JacobianPoint; inverse: null; } {
        if (p1.isInfinity || p1.y === 0n) return { result: JacobianPoint.infinity(), inverse: null };
        
        const p = this.p;
        const { x:X, y:Y, z:Z } = p1;

        
        // For a = -3: M = 3(X² - Z⁴) = 3(X - Z²)(X + Z²)
        const zz = (Z * Z) % p;
        const m = 3n * mod(X - zz, p) * (X + zz) % p;
        
        // S = 4*X*Y²
        const yy = (Y * Y) % p;
        const s = (4n * X * yy) % p;

        // X' = M² - 2*S (can be negative, handle it)
        const x3 = mod(m * m - 2n * s, p);
        
        // Y' = M*(S - X') - 8*Y⁴ (can be negative, handle it)
        const yyyy = (yy * yy) % p;
        const y3 = mod(m * (s - x3) - 8n * yyyy , p);
        
        // Z' = 2*Y*Z
        const z3 = (2n * Y * Z) % p;
        
        return { result: new JacobianPoint(x3, y3, z3), inverse: null  };
    }
} 