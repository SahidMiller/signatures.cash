export function mod(a:bigint, m:bigint) {
  const r = a % m;
  return r >= 0n ? r : r + m;
}

// Extended Euclidean Algorithm for modular inverse
export function modInverse(a:bigint, m:bigint):bigint {
    a = a % m;
    if (a === 0n) throw new Error('No inverse exists for 0');
    
    let [old_r, r] = [m, a];
    let [old_s, s] = [0n, 1n];
    
    while (r !== 0n) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }
    
    if (old_r !== 1n) throw new Error('No inverse exists');
    // Handle negative result: (old_s % m + m) % m
    return ((old_s % m) + m) % m;
}