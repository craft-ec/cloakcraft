#!/bin/bash
# Setup Sunspot proving/verifying keys for all circuits
# Requires: sunspot CLI installed (Go 1.24+)
# Usage: ./scripts/setup-sunspot.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CIRCUITS_DIR="$ROOT_DIR/circuits"
BUILD_DIR="$ROOT_DIR/build"

echo "=========================================="
echo "CloakCraft Sunspot Setup"
echo "=========================================="

# Check sunspot is installed
if ! command -v sunspot &> /dev/null; then
    echo "Error: sunspot CLI not found"
    echo "Install from: https://github.com/solana-foundation/sunspot"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Circuits to process (not lib, only binary circuits)
CIRCUITS=(
    "transfer/1x2:transfer_1x2"
    "transfer/1x3:transfer_1x3"
    "adapter/1x1:adapter_1x1"
    "adapter/1x2:adapter_1x2"
    "market/order_create:market_order_create"
    "market/order_fill:market_order_fill"
    "market/order_cancel:market_order_cancel"
    "swap/add_liquidity:swap_add_liquidity"
    "swap/remove_liquidity:swap_remove_liquidity"
    "swap/swap:swap_swap"
    "governance/encrypted_submit:governance_encrypted_submit"
)

echo ""
echo "Step 1: Compile ACIR to Gnark constraint system"
echo ""

for entry in "${CIRCUITS[@]}"; do
    path="${entry%%:*}"
    name="${entry##*:}"

    acir_path="$CIRCUITS_DIR/$path/target/$name.json"
    ccs_path="$BUILD_DIR/$name.ccs"

    if [ -f "$acir_path" ]; then
        echo "  [COMPILE] $name"
        sunspot compile "$acir_path" -o "$ccs_path" 2>&1 | sed 's/^/            /'
    else
        echo "  [SKIP] $name (ACIR not found - run build-circuits.sh first)"
    fi
done

echo ""
echo "Step 2: Generate proving and verifying keys"
echo ""

for entry in "${CIRCUITS[@]}"; do
    name="${entry##*:}"

    ccs_path="$BUILD_DIR/$name.ccs"
    pk_path="$BUILD_DIR/$name.pk"
    vk_path="$BUILD_DIR/$name.vk"

    if [ -f "$ccs_path" ]; then
        echo "  [SETUP] $name"
        sunspot setup "$ccs_path" --pk "$pk_path" --vk "$vk_path" 2>&1 | sed 's/^/           /'
    fi
done

echo ""
echo "=========================================="
echo "Setup complete!"
echo "Artifacts in: $BUILD_DIR"
echo "=========================================="
