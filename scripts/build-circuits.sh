#!/bin/bash
# Build all Noir circuits
# Usage: ./scripts/build-circuits.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CIRCUITS_DIR="$ROOT_DIR/circuits"

echo "=========================================="
echo "CloakCraft Circuit Builder"
echo "=========================================="

# Define circuits in order (lib first, then features)
CIRCUITS=(
    "lib"
    "transfer/1x2"
    "transfer/1x3"
    "adapter/1x1"
    "adapter/1x2"
    "market/order_create"
    "market/order_fill"
    "market/order_cancel"
    "swap/add_liquidity"
    "swap/remove_liquidity"
    "swap/swap"
    "governance/encrypted_submit"
)

echo ""
echo "Compiling circuits with Nargo..."
echo ""

for circuit in "${CIRCUITS[@]}"; do
    circuit_path="$CIRCUITS_DIR/$circuit"
    circuit_name=$(basename "$circuit")

    if [ -d "$circuit_path" ]; then
        echo "  [BUILD] $circuit"
        cd "$circuit_path"
        nargo compile 2>&1 | sed 's/^/         /'
        cd "$ROOT_DIR"
    else
        echo "  [SKIP] $circuit (not found)"
    fi
done

echo ""
echo "=========================================="
echo "Nargo compilation complete!"
echo "=========================================="

# Check if Sunspot is available
if [ ! -x "$SCRIPT_DIR/sunspot" ]; then
    echo ""
    echo "Note: Sunspot not found. Skipping Groth16 conversion."
    echo "Run './scripts/install-sunspot.sh' to enable Groth16 proof generation."
    echo ""
    exit 0
fi

echo ""
echo "=========================================="
echo "Converting to Groth16 with Sunspot"
echo "=========================================="

# Output directory for proving/verification keys
KEYS_DIR="$ROOT_DIR/keys"
mkdir -p "$KEYS_DIR"

# Nargo workspace outputs all compiled circuits to circuits/target/
TARGET_DIR="$CIRCUITS_DIR/target"

if [ ! -d "$TARGET_DIR" ]; then
    echo "  Error: No target directory found at $TARGET_DIR"
    echo "  Run 'nargo compile --workspace' first"
    exit 1
fi

# Process each compiled circuit in target directory
COMPILED_CIRCUITS=(
    "transfer_1x2"
    "transfer_1x3"
    "adapter_1x1"
    "adapter_1x2"
    "market_order_create"
    "market_order_fill"
    "market_order_cancel"
    "swap_add_liquidity"
    "swap_remove_liquidity"
    "swap_swap"
    "governance_encrypted_submit"
)

for circuit_name in "${COMPILED_CIRCUITS[@]}"; do

    acir_json="$TARGET_DIR/${circuit_name}.json"
    if [ ! -f "$acir_json" ]; then
        echo "  [SKIP] $circuit_name (no compiled ACIR at $acir_json)"
        continue
    fi

    echo ""
    echo "  [SUNSPOT] $circuit_name"

    # Step 1: Compile ACIR to CCS (Customizable Constraint System)
    echo "           Compiling ACIR to CCS..."
    "$SCRIPT_DIR/sunspot" compile "$acir_json" 2>&1 | sed 's/^/           /'

    # Sunspot outputs CCS file next to the ACIR file with .ccs extension
    ccs_file="$TARGET_DIR/${circuit_name}.ccs"
    if [ ! -f "$ccs_file" ]; then
        echo "           Warning: CCS file not generated at $ccs_file"
        continue
    fi

    # Step 2: Generate proving and verification keys (trusted setup)
    echo "           Running trusted setup..."
    "$SCRIPT_DIR/sunspot" setup "$ccs_file" 2>&1 | sed 's/^/           /'

    # Sunspot outputs pk and vk files next to the CCS file
    pk_file="$TARGET_DIR/${circuit_name}.pk"
    vk_file="$TARGET_DIR/${circuit_name}.vk"

    if [ ! -f "$pk_file" ] || [ ! -f "$vk_file" ]; then
        echo "           Warning: PK/VK files not generated"
        continue
    fi

    # Copy keys to central location
    cp "$pk_file" "$KEYS_DIR/${circuit_name}.pk"
    cp "$vk_file" "$KEYS_DIR/${circuit_name}.vk"

    echo "           Done! Keys: ${circuit_name}.pk, ${circuit_name}.vk"
done

echo ""
echo "=========================================="
echo "Groth16 conversion complete!"
echo "Keys saved to: $KEYS_DIR"
echo ""
echo "To deploy verifier to Solana, run:"
echo "  sunspot deploy keys/<circuit_name>.vk"
echo "=========================================="
