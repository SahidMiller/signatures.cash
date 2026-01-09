import { AffinePoint, JacobianPoint } from "./point.ts";
import { mod, modInverse } from "./util.ts";

export abstract class Curve {
    abstract p: bigint;
    abstract a: bigint
    abstract Gx: bigint;
    abstract Gy: bigint
    abstract n: bigint;
    abstract bits: number
    abstract name: string;

    createJacobianGenerator(): JacobianPoint {
        return new JacobianPoint(this.Gx, this.Gy, 1n);
    };

    addJacobianPoints(p1: JacobianPoint, p2: JacobianPoint): { result: JacobianPoint, inverse: null } {
        if (p1.isInfinity) return { result: new JacobianPoint(p2.x, p2.y, p2.z), inverse: null };
        if (p2.isInfinity) return { result: new JacobianPoint(p1.x, p1.y, p1.z), inverse: null };
        
        const p = this.p;

        const { x: X1, y: Y1, z: Z1 } = p1;
        const { x: X2, y: Y2, z: Z2 } = p2;
        
        const z1z1 = (Z1 * Z1) % p;
        const z2z2 = (Z2 * Z2) % p;
        
        const u1 = (X1 * z2z2) % p;
        const u2 = (X2 * z1z1) % p;
        const h = mod(u2 - u1, p);
        
        const s1 = (Y1 * Z2 * z2z2) % p;
        const s2 = (Y2 * Z1 * z1z1) % p;
        const r = mod(s2 - s1, p);
        
        if (u1 === u2) {
            if (s1 === s2) return this.doubleJacobianPoint(p1);
            return { result: JacobianPoint.infinity(), inverse: null }
        }

        // // Check if points are the same or negatives
        // if (H === 0n) {
        //     if (R === 0n) {
        //         return this.double();
        //     }
        //     return JacobianPoint.infinity();
        // }
        
        const z3 = (Z1 * Z2 * h) % p;

        const hh = (h * h) % p;
        const hhh = (h * hh) % p;
        const v = (u1 * hh) % p;
        const x3 = mod(r * r - hhh - 2n * v, p);
        const y3 = mod(r * (v - x3) - s1 * hhh, p);
        
        return { result: new JacobianPoint(x3, y3, z3), inverse: null };
    }

    jacobianToAffine(p1: JacobianPoint): { result: AffinePoint, inverse: bigint|null } {
        if (p1.isInfinity) return { result: AffinePoint.infinity(), inverse: null };
        
        const p = this.p;
        const zInv = modInverse(p1.z, p);
        const zInv2 = (zInv * zInv) % p;
        const zInv3 = (zInv2 * zInv) % p;
        
        const x = (p1.x * zInv2) % p;
        const y = (p1.y * zInv3) % p;
        
        return { result: new AffinePoint(x, y, false), inverse: zInv };
    }

    affineToJacobian(p1: AffinePoint): JacobianPoint {
        if (p1.isInfinity) return JacobianPoint.infinity();
        return new JacobianPoint(p1.x, p1.y, 1n);
    }

    abstract doubleJacobianPoint(p: JacobianPoint): { result: JacobianPoint, inverse: null };
    
    createAffineGenerator(): AffinePoint {
        return new AffinePoint(this.Gx, this.Gy, false);
    }

    addAffinePoints(p1: AffinePoint, p2: AffinePoint): { result: AffinePoint, inverse: bigint | null} {
        if (p1.isInfinity) return { result: new AffinePoint(p2.x, p2.y, p2.isInfinity), inverse: null };
        if (p2.isInfinity) return { result: new AffinePoint(p1.x, p1.y, p1.isInfinity), inverse: null };
        
        const p = this.p;

        const { x: X1, y: Y1 } = p1;
        const { x: X2, y: Y2 } = p2;

        // Check if points have the same x-coordinate
        if (X1 === X2) {
            // If y-coordinates are also equal, this is point doubling
            if (Y1 === Y2) { 
                return this.doubleAffinePoint(p1);
            }
            // If y-coordinates differ, points are inverses: P + (-P) = O
            return { result: AffinePoint.infinity(), inverse: null }; // P + (-P) = O
        }
        
        // Standard point addition: P1 + P2
        // λ = (y2 - y1) / (x2 - x1) mod p
        const dy = mod(Y2 - Y1, p);
        const dx = mod(X2 - X1, p);
        const ratioInverse = modInverse(dx, p);
        const lambda = (dy * ratioInverse) % p;
        
        // x3 = λ² - x1 - x2 mod p
        const x3 = mod((lambda * lambda) - X1 - X2, p);

        // y3 = λ(x1 - x3) - y1 mod p
        const y3 = mod(lambda * (X1 - x3) - Y1, p);
        
        return { result: new AffinePoint(x3, y3, false), inverse: ratioInverse };
    }

    doubleAffinePoint(p1: AffinePoint): { result: AffinePoint, inverse: bigint | null } {
        // Handle special case where y = 0
        if (p1.isInfinity || p1.y === 0n) return { result: AffinePoint.infinity(), inverse: null };
        
        const p = this.p;
        const a = this.a; // curve parameter
        const { x: X, y: Y } = p1;

        // Point doubling: 2P
        // λ = (3x² + a) / (2y) mod p
        const xx = X * X;
        const numerator = mod(3n * xx + a, p);
        const denominator = (2n * Y) % p;
        const zDenominator = modInverse(denominator, p);
        const lambda = (numerator * zDenominator) % p;
        
        // x3 = λ² - 2x mod p (handle negative)
        const x3 = mod((lambda * lambda) - (2n * X), p);
        
        // y3 = λ(x - x3) - y mod p (handle negative)
        const y3 = mod(lambda * (X - x3) - Y, p);
        
        return { result: new AffinePoint(x3, y3, false), inverse: zDenominator };
    }

    negateJacobianPoint(p1: JacobianPoint): JacobianPoint {
        // Handle negative: ((-Y % p) + p) % p
        const p = this.p;
        return new JacobianPoint(p1.x, mod(-p1.y, p), p1.z);
    }

    negateAffinePoint(p1: AffinePoint): AffinePoint {
        if (p1.isInfinity) return AffinePoint.infinity();
               
        // Handle negative: ((-y % p) + p) % p
        const p = this.p;
        return new AffinePoint(p1.x, mod(-p1.y, p), false);
    }
    
    addMixedPoints(p1: JacobianPoint, p2: AffinePoint): { result: JacobianPoint, inverse: null } {
        if (p1.isInfinity) return { result: this.affineToJacobian(p2), inverse: null };
        if (p2.isInfinity) return { result: new JacobianPoint(p1.x, p1.y, p1.z), inverse: null };

        const p = this.p;
        const { x: X1, y: Y1, z: Z1 } = p1;
        const { x: X2, y: Y2 } = p2;
        
        const z1z1 = (Z1 * Z1) % p;
        const u2 = (X2 * z1z1) % p;
        const s2 = (Y2 * Z1 * z1z1) % p;
        
        const h = mod((u2 - X1), p);
        const r = mod((s2 - Y1), p);

        if (h === 0n) {
            if (r === 0n) return this.doubleJacobianPoint(p1);
            return { result: JacobianPoint.infinity(), inverse: null };
        }

        // if (X1 === u2) {
        //     if (Y1 === s2) return this.double();
        //     return JacobianPoint.infinity();
        // }
        
        const hh = (h * h) % p;
        const hhh = (h * hh) % p;
        const v = (X1 * hh) % p;
        
        const x3 = mod((r * r - hhh - 2n * v), p);
        const y3 = mod((r * (v - x3) - Y1 * hhh), p);
        const z3 = (Z1 * h) % p;
        
        return { result: new JacobianPoint(x3, y3, z3), inverse: null  };
    };
    
}