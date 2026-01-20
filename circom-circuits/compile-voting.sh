#!/bin/bash
# Compile voting circom circuits
# Usage: ./compile-voting.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/circuits/voting"
BUILD_DIR="$SCRIPT_DIR/build/voting"
PTAU_FILE="$SCRIPT_DIR/pot16_final.ptau"

# Create build directory
mkdir -p "$BUILD_DIR"

# Check dependencies
if ! command -v circom &> /dev/null; then
    echo "Error: circom not found. Install with: npm install -g circom"
    exit 1
fi

# Use npx for snarkjs (from local node_modules)
SNARKJS="npx snarkjs"

if [ ! -f "$PTAU_FILE" ]; then
    echo "Error: Powers of Tau file not found at $PTAU_FILE"
    exit 1
fi

# Circuits to compile
CIRCUITS=(
    "vote_snapshot"
    "change_vote_snapshot"
    "vote_spend"
    "close_position"
    "claim"
)

echo "=========================================="
echo "CloakCraft Voting Circuit Compiler"
echo "=========================================="
echo ""

for circuit in "${CIRCUITS[@]}"; do
    circuit_file="$CIRCUITS_DIR/${circuit}.circom"

    if [ ! -f "$circuit_file" ]; then
        echo "[SKIP] $circuit - file not found"
        continue
    fi

    echo "[COMPILE] $circuit"
    echo "  Step 1: Compiling circom to r1cs, wasm, sym..."

    circom "$circuit_file" \
        --r1cs \
        --wasm \
        --sym \
        -o "$BUILD_DIR" \
        -l "$SCRIPT_DIR/node_modules"

    echo "  Step 2: Generating initial zkey..."
    $SNARKJS groth16 setup \
        "$BUILD_DIR/${circuit}.r1cs" \
        "$PTAU_FILE" \
        "$BUILD_DIR/${circuit}_0000.zkey"

    echo "  Step 3: Contributing to zkey (random entropy)..."
    echo "random_entropy_for_${circuit}_$(date +%s)" | $SNARKJS zkey contribute \
        "$BUILD_DIR/${circuit}_0000.zkey" \
        "$BUILD_DIR/${circuit}_final.zkey" \
        --name="CloakCraft Voting" \
        -v

    echo "  Step 4: Exporting verification key..."
    $SNARKJS zkey export verificationkey \
        "$BUILD_DIR/${circuit}_final.zkey" \
        "$BUILD_DIR/${circuit}_verification_key.json"

    echo "  [DONE] $circuit"
    echo ""
done

echo "=========================================="
echo "Compilation complete!"
echo "Output directory: $BUILD_DIR"
echo ""
echo "Files generated per circuit:"
echo "  - {circuit}.r1cs     (constraint system)"
echo "  - {circuit}.wasm     (witness generator)"
echo "  - {circuit}.sym      (symbol file)"
echo "  - {circuit}_final.zkey (proving key)"
echo "  - {circuit}_verification_key.json"
echo "=========================================="
