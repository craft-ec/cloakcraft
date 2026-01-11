#!/bin/bash
# Generate a Groth16 proof for a circuit
# Usage: ./scripts/prove.sh <circuit_name> <witness_path>
# Example: ./scripts/prove.sh transfer_1x3 ./witness.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/build"

CIRCUIT_NAME="$1"
WITNESS_PATH="$2"

if [ -z "$CIRCUIT_NAME" ] || [ -z "$WITNESS_PATH" ]; then
    echo "Usage: $0 <circuit_name> <witness_path>"
    echo "Example: $0 transfer_1x3 ./witness.gz"
    exit 1
fi

echo "=========================================="
echo "CloakCraft Proof Generator"
echo "Circuit: $CIRCUIT_NAME"
echo "=========================================="

PK_PATH="$BUILD_DIR/$CIRCUIT_NAME.pk"
PROOF_PATH="$BUILD_DIR/$CIRCUIT_NAME.proof"
PW_PATH="$BUILD_DIR/$CIRCUIT_NAME.pw"

if [ ! -f "$PK_PATH" ]; then
    echo "Error: Proving key not found: $PK_PATH"
    echo "Run setup-sunspot.sh first"
    exit 1
fi

echo ""
echo "Generating Groth16 proof..."
echo ""

sunspot prove "$PK_PATH" "$WITNESS_PATH" \
    --proof "$PROOF_PATH" \
    --public-witness "$PW_PATH"

echo ""
echo "=========================================="
echo "Proof generated!"
echo "  Proof: $PROOF_PATH"
echo "  Public Witness: $PW_PATH"
echo "=========================================="
