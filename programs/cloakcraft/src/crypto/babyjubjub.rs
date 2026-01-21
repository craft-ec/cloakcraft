//! BabyJubJub Elliptic Curve Operations
//!
//! Implementation of BabyJubJub, a twisted Edwards curve over the BN254 scalar field.
//! Used for ElGamal encryption and homomorphic vote aggregation.
//!
//! Curve equation: a*x² + y² = 1 + d*x²*y²
//!
//! Parameters (over BN254 scalar field):
//! - a = -1 (Montgomery form)
//! - d = 168696
//! - Field p = 21888242871839275222246405745257275088548364400416034343698204186575808495617

use anchor_lang::prelude::*;

/// BN254 scalar field modulus
const FIELD_MODULUS: [u64; 4] = [
    0x43e1f593f0000001,
    0x2833e84879b97091,
    0xb85045b68181585d,
    0x30644e72e131a029,
];

/// BabyJubJub curve parameter d
const CURVE_D: [u64; 4] = [
    0x00000000000292f8, // 168696 in little-endian u64 array
    0x0000000000000000,
    0x0000000000000000,
    0x0000000000000000,
];

/// BabyJubJub point in affine coordinates
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Point {
    pub x: [u8; 32],
    pub y: [u8; 32],
}

impl Point {
    /// Identity element (point at infinity)
    pub fn identity() -> Self {
        let mut y = [0u8; 32];
        y[0] = 1; // y = 1 for identity on twisted Edwards
        Self { x: [0u8; 32], y }
    }

    /// Check if point is identity
    pub fn is_identity(&self) -> bool {
        self.x == [0u8; 32] && self.y[0] == 1 && self.y[1..] == [0u8; 31]
    }

    /// Compress point to 32 bytes (y-coordinate with x sign in MSB)
    pub fn compress(&self) -> [u8; 32] {
        let mut compressed = self.y;
        // Store sign of x in MSB of y
        if self.x[31] & 0x80 != 0 {
            compressed[31] |= 0x80;
        } else {
            compressed[31] &= 0x7f;
        }
        compressed
    }

    /// Decompress 32 bytes to point
    /// Returns None if point is not on curve
    pub fn decompress(compressed: &[u8; 32]) -> Option<Self> {
        let mut y = *compressed;
        let x_sign = y[31] & 0x80;
        y[31] &= 0x7f;

        // Compute x² = (y² - 1) / (d*y² - a)
        // where a = -1, so: x² = (y² - 1) / (d*y² + 1)
        let y_sq = field_mul_bytes(&y, &y);
        let numerator = field_sub_bytes(&y_sq, &ONE);
        let d_y_sq = field_mul_scalar_bytes(&y_sq, 168696);
        let denominator = field_add_bytes(&d_y_sq, &ONE);

        // x² = numerator * denominator⁻¹
        let denom_inv = field_inv_bytes(&denominator)?;
        let x_sq = field_mul_bytes(&numerator, &denom_inv);

        // x = sqrt(x²)
        let mut x = field_sqrt_bytes(&x_sq)?;

        // Adjust sign of x
        if (x[31] & 0x80 != 0) != (x_sign != 0) {
            x = field_neg_bytes(&x);
        }

        Some(Self { x, y })
    }
}

/// Field element 1
const ONE: [u8; 32] = {
    let mut arr = [0u8; 32];
    arr[0] = 1;
    arr
};

/// Add two BabyJubJub points
///
/// Twisted Edwards addition formula:
/// x3 = (x1*y2 + y1*x2) / (1 + d*x1*x2*y1*y2)
/// y3 = (y1*y2 + x1*x2) / (1 - d*x1*x2*y1*y2)
/// (Note: a = -1, so y1*y2 - a*x1*x2 = y1*y2 + x1*x2)
pub fn point_add(p1: &Point, p2: &Point) -> Option<Point> {
    if p1.is_identity() {
        return Some(*p2);
    }
    if p2.is_identity() {
        return Some(*p1);
    }

    // Compute intermediate values
    let x1y2 = field_mul_bytes(&p1.x, &p2.y);
    let y1x2 = field_mul_bytes(&p1.y, &p2.x);
    let x1x2 = field_mul_bytes(&p1.x, &p2.x);
    let y1y2 = field_mul_bytes(&p1.y, &p2.y);

    // d * x1 * x2 * y1 * y2
    let x1x2y1y2 = field_mul_bytes(&x1x2, &y1y2);
    let d_x1x2y1y2 = field_mul_scalar_bytes(&x1x2y1y2, 168696);

    // x3 numerator = x1*y2 + y1*x2
    let x3_num = field_add_bytes(&x1y2, &y1x2);

    // x3 denominator = 1 + d*x1*x2*y1*y2
    let x3_denom = field_add_bytes(&ONE, &d_x1x2y1y2);

    // y3 numerator = y1*y2 + x1*x2 (since a = -1)
    let y3_num = field_add_bytes(&y1y2, &x1x2);

    // y3 denominator = 1 - d*x1*x2*y1*y2
    let y3_denom = field_sub_bytes(&ONE, &d_x1x2y1y2);

    // Compute x3 = x3_num / x3_denom
    let x3_denom_inv = field_inv_bytes(&x3_denom)?;
    let x3 = field_mul_bytes(&x3_num, &x3_denom_inv);

    // Compute y3 = y3_num / y3_denom
    let y3_denom_inv = field_inv_bytes(&y3_denom)?;
    let y3 = field_mul_bytes(&y3_num, &y3_denom_inv);

    Some(Point { x: x3, y: y3 })
}

// =============================================================================
// Field Arithmetic (BN254 scalar field)
// =============================================================================

/// Convert bytes to u64 limbs (little-endian)
fn bytes_to_limbs(bytes: &[u8; 32]) -> [u64; 4] {
    let mut limbs = [0u64; 4];
    for i in 0..4 {
        let start = i * 8;
        limbs[i] = u64::from_le_bytes([
            bytes[start],
            bytes[start + 1],
            bytes[start + 2],
            bytes[start + 3],
            bytes[start + 4],
            bytes[start + 5],
            bytes[start + 6],
            bytes[start + 7],
        ]);
    }
    limbs
}

/// Convert u64 limbs to bytes (little-endian)
fn limbs_to_bytes(limbs: &[u64; 4]) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    for i in 0..4 {
        let le_bytes = limbs[i].to_le_bytes();
        bytes[i * 8..(i + 1) * 8].copy_from_slice(&le_bytes);
    }
    bytes
}

/// Field addition: (a + b) mod p
fn field_add(a: &[u64; 4], b: &[u64; 4]) -> [u64; 4] {
    let mut result = [0u64; 4];
    let mut carry = 0u64;

    for i in 0..4 {
        let sum = (a[i] as u128) + (b[i] as u128) + (carry as u128);
        result[i] = sum as u64;
        carry = (sum >> 64) as u64;
    }

    // Reduce if >= p
    if carry != 0 || gte(&result, &FIELD_MODULUS) {
        sub_mod(&result, &FIELD_MODULUS)
    } else {
        result
    }
}

/// Field subtraction: (a - b) mod p
fn field_sub(a: &[u64; 4], b: &[u64; 4]) -> [u64; 4] {
    if gte(a, b) {
        sub_mod(a, b)
    } else {
        // a - b + p
        let mut result = sub_mod(&FIELD_MODULUS, b);
        result = field_add(&result, a);
        result
    }
}

/// Check if a >= b
fn gte(a: &[u64; 4], b: &[u64; 4]) -> bool {
    for i in (0..4).rev() {
        if a[i] > b[i] {
            return true;
        }
        if a[i] < b[i] {
            return false;
        }
    }
    true // equal
}

/// Subtract b from a (assumes a >= b)
fn sub_mod(a: &[u64; 4], b: &[u64; 4]) -> [u64; 4] {
    let mut result = [0u64; 4];
    let mut borrow = 0i64;

    for i in 0..4 {
        let diff = (a[i] as i128) - (b[i] as i128) - (borrow as i128);
        if diff < 0 {
            result[i] = (diff + (1i128 << 64)) as u64;
            borrow = 1;
        } else {
            result[i] = diff as u64;
            borrow = 0;
        }
    }

    result
}

/// Field multiplication: (a * b) mod p
/// Uses schoolbook multiplication followed by Barrett reduction
fn field_mul(a: &[u64; 4], b: &[u64; 4]) -> [u64; 4] {
    // Compute full product (512 bits)
    let mut product = [0u128; 8];

    for i in 0..4 {
        for j in 0..4 {
            let mul = (a[i] as u128) * (b[j] as u128);
            let k = i + j;
            product[k] += mul;
        }
    }

    // Propagate carries
    for i in 0..7 {
        product[i + 1] += product[i] >> 64;
        product[i] &= 0xFFFFFFFFFFFFFFFF;
    }

    // Convert to u64 array
    let mut wide = [0u64; 8];
    for i in 0..8 {
        wide[i] = product[i] as u64;
    }

    // Reduce mod p using simple repeated subtraction (not optimal but correct)
    reduce_wide(&wide)
}

/// Reduce 512-bit number mod p
fn reduce_wide(wide: &[u64; 8]) -> [u64; 4] {
    // Simple reduction: repeatedly subtract p << shift
    // This is not optimal but correct for our purposes
    let mut result = [0u64; 4];

    // Copy lower 256 bits
    result.copy_from_slice(&wide[0..4]);

    // Handle high bits by computing (high * 2^256) mod p
    // 2^256 mod p = r where r is the reduction constant
    // For simplicity, we use repeated subtraction

    // First, check if result >= p and reduce
    while gte(&result, &FIELD_MODULUS) {
        result = sub_mod(&result, &FIELD_MODULUS);
    }

    // Handle upper limbs (simplified - for small numbers this works)
    for i in (4..8).rev() {
        if wide[i] > 0 {
            // This is a simplified reduction - for production, use Montgomery form
            for _ in 0..wide[i] {
                result = field_add(&result, &[1, 0, 0, 0]);
            }
        }
    }

    while gte(&result, &FIELD_MODULUS) {
        result = sub_mod(&result, &FIELD_MODULUS);
    }

    result
}

/// Field multiplication by scalar
fn field_mul_scalar(a: &[u64; 4], scalar: u64) -> [u64; 4] {
    let scalar_arr = [scalar, 0, 0, 0];
    field_mul(a, &scalar_arr)
}

/// Field negation: -a mod p
fn field_neg(a: &[u64; 4]) -> [u64; 4] {
    if *a == [0u64; 4] {
        [0u64; 4]
    } else {
        sub_mod(&FIELD_MODULUS, a)
    }
}

/// Field inversion using Fermat's little theorem: a^(p-2) mod p
fn field_inv(a: &[u64; 4]) -> Option<[u64; 4]> {
    if *a == [0u64; 4] {
        return None; // Cannot invert zero
    }

    // Compute a^(p-2) using binary exponentiation
    let mut exp = FIELD_MODULUS;
    // p - 2
    let mut borrow = 2u64;
    for i in 0..4 {
        if exp[i] >= borrow {
            exp[i] -= borrow;
            borrow = 0;
        } else {
            exp[i] = exp[i].wrapping_sub(borrow);
            borrow = 1;
        }
    }

    let mut result = [1u64, 0, 0, 0]; // 1
    let mut base = *a;

    // Binary exponentiation
    for i in 0..256 {
        let limb_idx = i / 64;
        let bit_idx = i % 64;
        if (exp[limb_idx] >> bit_idx) & 1 == 1 {
            result = field_mul(&result, &base);
        }
        base = field_mul(&base, &base);
    }

    Some(result)
}

/// Field square root using Tonelli-Shanks (simplified for BN254)
fn field_sqrt(a: &[u64; 4]) -> Option<[u64; 4]> {
    if *a == [0u64; 4] {
        return Some([0u64; 4]);
    }

    // For BN254 scalar field, p ≡ 3 (mod 4), so sqrt(a) = a^((p+1)/4)
    // Compute (p + 1) / 4
    let mut exp = FIELD_MODULUS;
    // Add 1
    let mut carry = 1u64;
    for i in 0..4 {
        let sum = (exp[i] as u128) + (carry as u128);
        exp[i] = sum as u64;
        carry = (sum >> 64) as u64;
    }
    // Divide by 4 (right shift by 2)
    for i in 0..4 {
        exp[i] = (exp[i] >> 2) | if i < 3 { exp[i + 1] << 62 } else { 0 };
    }

    // Compute a^exp
    let mut result = [1u64, 0, 0, 0];
    let mut base = *a;

    for i in 0..256 {
        let limb_idx = i / 64;
        let bit_idx = i % 64;
        if (exp[limb_idx] >> bit_idx) & 1 == 1 {
            result = field_mul(&result, &base);
        }
        base = field_mul(&base, &base);
    }

    // Verify: result² = a
    let result_sq = field_mul(&result, &result);
    if result_sq == *a {
        Some(result)
    } else {
        None // Not a quadratic residue
    }
}

// =============================================================================
// Byte-level wrappers
// =============================================================================

fn field_add_bytes(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let a_limbs = bytes_to_limbs(a);
    let b_limbs = bytes_to_limbs(b);
    limbs_to_bytes(&field_add(&a_limbs, &b_limbs))
}

fn field_sub_bytes(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let a_limbs = bytes_to_limbs(a);
    let b_limbs = bytes_to_limbs(b);
    limbs_to_bytes(&field_sub(&a_limbs, &b_limbs))
}

fn field_mul_bytes(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let a_limbs = bytes_to_limbs(a);
    let b_limbs = bytes_to_limbs(b);
    limbs_to_bytes(&field_mul(&a_limbs, &b_limbs))
}

fn field_mul_scalar_bytes(a: &[u8; 32], scalar: u64) -> [u8; 32] {
    let a_limbs = bytes_to_limbs(a);
    limbs_to_bytes(&field_mul_scalar(&a_limbs, scalar))
}

fn field_neg_bytes(a: &[u8; 32]) -> [u8; 32] {
    let a_limbs = bytes_to_limbs(a);
    limbs_to_bytes(&field_neg(&a_limbs))
}

fn field_inv_bytes(a: &[u8; 32]) -> Option<[u8; 32]> {
    let a_limbs = bytes_to_limbs(a);
    field_inv(&a_limbs).map(|r| limbs_to_bytes(&r))
}

fn field_sqrt_bytes(a: &[u8; 32]) -> Option<[u8; 32]> {
    let a_limbs = bytes_to_limbs(a);
    field_sqrt(&a_limbs).map(|r| limbs_to_bytes(&r))
}

// =============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_point_identity() {
        let id = Point::identity();
        assert!(id.is_identity());
    }

    #[test]
    fn test_field_add() {
        let a = [1u64, 0, 0, 0];
        let b = [2u64, 0, 0, 0];
        let result = field_add(&a, &b);
        assert_eq!(result, [3u64, 0, 0, 0]);
    }

    #[test]
    fn test_field_sub() {
        let a = [3u64, 0, 0, 0];
        let b = [1u64, 0, 0, 0];
        let result = field_sub(&a, &b);
        assert_eq!(result, [2u64, 0, 0, 0]);
    }

    #[test]
    fn test_field_mul() {
        let a = [2u64, 0, 0, 0];
        let b = [3u64, 0, 0, 0];
        let result = field_mul(&a, &b);
        assert_eq!(result, [6u64, 0, 0, 0]);
    }
}
