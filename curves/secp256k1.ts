import { Curve } from "./curve.ts";
import { JacobianPoint } from "./point.ts";

export class Secp256k1Curve extends Curve {
    public name = 'secp256k1';
    public p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
    public n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
    public a = 0n;
    public b = 7n;
    public Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
    public Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;
    public bits = 256;

    doubleJacobianPoint(p1: JacobianPoint): { result: JacobianPoint; inverse: null; } {
        if (p1.isInfinity || p1.y === 0n) return { result: JacobianPoint.infinity(), inverse: null };

        const p = this.p;
        const { x:X, y:Y, z:Z } = p1;
        
        
        // For a=0: M = 3*X²
        const M = (3n * X * X) % p;

        // For a=0: S = 4*X*Y²
        const Y2 = (Y * Y) % p;
        const S = (4n * X * Y2) % p;
        
        // X' = M² - 2*S (can be negative, handle it)
        const X3 = ((M * M - 2n * S) % p + p) % p;

        // Y' = M*(S - X') - 8*Y⁴ (can be negative, handle it)
        const Y4 = (Y2 * Y2) % p;
        const Y3 = ((M * (S - X3) - 8n * Y4) % p + p) % p;
        
        // Z' = 2*Y*Z
        const Z3 = (2n * Y * Z) % p;

        return { result: new JacobianPoint(X3, Y3, Z3), inverse: null  };
    }
} 