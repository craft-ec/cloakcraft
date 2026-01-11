// BabyJubJub Elliptic Curve Operations
// Twisted Edwards curve: ax^2 + y^2 = 1 + dx^2y^2
// Used for stealth addresses and key derivation

use crate::constants::{
    BABY_JUBJUB_A,
    BABY_JUBJUB_D,
    BABY_JUBJUB_BASE_X,
    BABY_JUBJUB_BASE_Y
};

// Point on BabyJubJub curve
pub struct Point {
    pub x: Field,
    pub y: Field,
}

impl Point {
    // Identity point (neutral element)
    pub fn identity() -> Self {
        Point { x: 0, y: 1 }
    }

    // Generator point
    pub fn generator() -> Self {
        Point {
            x: BABY_JUBJUB_BASE_X,
            y: BABY_JUBJUB_BASE_Y,
        }
    }

    // Check if point is identity
    pub fn is_identity(self) -> bool {
        (self.x == 0) & (self.y == 1)
    }

    // Check if point is on curve
    pub fn is_on_curve(self) -> bool {
        // ax^2 + y^2 = 1 + dx^2y^2
        let x2 = self.x * self.x;
        let y2 = self.y * self.y;
        let lhs = BABY_JUBJUB_A * x2 + y2;
        let rhs = 1 + BABY_JUBJUB_D * x2 * y2;
        lhs == rhs
    }

    // Negate point
    pub fn negate(self) -> Self {
        Point {
            x: 0 - self.x,
            y: self.y,
        }
    }

    // Check equality
    pub fn equals(self, other: Point) -> bool {
        (self.x == other.x) & (self.y == other.y)
    }
}

// Internal addition of two non-identity points
fn add_nonidentity(p1: Point, p2: Point) -> Point {
    let x1 = p1.x;
    let y1 = p1.y;
    let x2 = p2.x;
    let y2 = p2.y;

    // x3 = (x1*y2 + y1*x2) / (1 + d*x1*x2*y1*y2)
    // y3 = (y1*y2 - a*x1*x2) / (1 - d*x1*x2*y1*y2)

    let x1y2 = x1 * y2;
    let y1x2 = y1 * x2;
    let x1x2 = x1 * x2;
    let y1y2 = y1 * y2;

    let dx1x2y1y2 = BABY_JUBJUB_D * x1x2 * y1y2;

    let x3_num = x1y2 + y1x2;
    let x3_den = 1 + dx1x2y1y2;

    let y3_num = y1y2 - BABY_JUBJUB_A * x1x2;
    let y3_den = 1 - dx1x2y1y2;

    // Safe division (den should never be 0 for valid curve points)
    let x3 = x3_num / x3_den;
    let y3 = y3_num / y3_den;

    Point { x: x3, y: y3 }
}

// Edwards curve point addition
// Formula: https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html
pub fn point_add(p1: Point, p2: Point) -> Point {
    // Handle identity cases without early return
    let result = if p1.is_identity() {
        p2
    } else if p2.is_identity() {
        p1
    } else {
        add_nonidentity(p1, p2)
    };
    result
}

// Point doubling (specialized addition)
pub fn point_double(p: Point) -> Point {
    point_add(p, p)
}

// Scalar multiplication using double-and-add
// Note: This is a simplified version; for production use constant-time algorithm
pub fn scalar_mul(scalar: Field, point: Point) -> Point {
    let mut result = Point::identity();
    let mut temp = point;

    // Convert scalar to bits (254 bits for BN254)
    let scalar_bits: [u1; 254] = scalar.to_le_bits();

    for i in 0..254 {
        if scalar_bits[i] == 1 {
            result = point_add(result, temp);
        }
        temp = point_double(temp);
    }

    result
}

// Derive public key from private key
pub fn derive_public_key(private_key: Field) -> Point {
    scalar_mul(private_key, Point::generator())
}

// Point subtraction
pub fn point_sub(p1: Point, p2: Point) -> Point {
    point_add(p1, p2.negate())
}

#[test]
fn test_identity() {
    let id = Point::identity();
    assert(id.is_identity());
    assert(id.is_on_curve());
}

#[test]
fn test_generator_on_curve() {
    let g = Point::generator();
    assert(g.is_on_curve());
}

#[test]
fn test_point_add_identity() {
    let g = Point::generator();
    let id = Point::identity();
    let result = point_add(g, id);
    assert(result.equals(g));
}

#[test]
fn test_point_double() {
    let g = Point::generator();
    let g2 = point_double(g);
    assert(g2.is_on_curve());
    assert(!g2.equals(g));
}

#[test]
fn test_scalar_mul_identity() {
    let g = Point::generator();
    let result = scalar_mul(1, g);
    assert(result.equals(g));
}
