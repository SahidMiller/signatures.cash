export abstract class Point {
    abstract isInfinity: boolean;
    abstract toString(): string;
}
    
export class AffinePoint extends Point {
    public x: bigint;
    public y: bigint;
    public readonly isInfinity: boolean;

    constructor(x: bigint, y:bigint, isInfinity = false) {
        super();
        this.x = x;
        this.y = y;
        this.isInfinity = isInfinity;
    }

    static infinity() {
        return new AffinePoint(0n, 0n, true);
    }

    toString(): string {
        if (this.isInfinity) return 'AffinePoint(Infinity)';
        return `AffinePoint(x=${this.x.toString(16)}, y=${this.y.toString(16)})`;
    }

    equals(other: AffinePoint): boolean {
        if (this.isInfinity && other.isInfinity) return true;
        if (this.isInfinity || other.isInfinity) return false;
        return this.x === other.x && this.y === other.y;
    }
}

export class JacobianPoint extends Point {
    public x: bigint;
    public y: bigint;
    public z: bigint;

    constructor(x: bigint, y:bigint, z: bigint) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static infinity() {
        return new JacobianPoint(1n, 1n, 0n);
    }

    get isInfinity(): boolean {
        return this.z === 0n;
    }

    toString(): string {
        if (this.isInfinity) return 'JacobianPoint(Infinity)';
        return `JacobianPoint(x=${this.x.toString(16)}, y=${this.y.toString(16)}, z=${this.z.toString(16)})`;
    }
}