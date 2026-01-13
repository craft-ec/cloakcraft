#!/bin/bash
# Deploy Solana verifier programs for all circuits
# Usage: ./scripts/deploy-verifiers.sh [devnet|mainnet-beta]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/build"
VERIFIERS_DIR="$BUILD_DIR/verifiers"

CLUSTER="${1:-devnet}"

echo "=========================================="
echo "CloakCraft Verifier Deployment"
echo "Cluster: $CLUSTER"
echo "=========================================="

# Check sunspot and solana CLI
if ! command -v sunspot &> /dev/null; then
    echo "Error: sunspot CLI not found"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo "Error: solana CLI not found"
    exit 1
fi

# Create verifiers directory
mkdir -p "$VERIFIERS_DIR"

# Circuits to deploy
CIRCUITS=(
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

# Output file for program IDs
PROGRAM_IDS_FILE="$BUILD_DIR/program_ids_$CLUSTER.json"
echo "{" > "$PROGRAM_IDS_FILE"

echo ""
echo "Deploying verifiers..."
echo ""

FIRST=true
for circuit in "${CIRCUITS[@]}"; do
    vk_path="$BUILD_DIR/$circuit.vk"
    so_path="$VERIFIERS_DIR/$circuit.so"

    if [ -f "$vk_path" ]; then
        echo "  [DEPLOY] $circuit"

        # Deploy and capture program ID
        OUTPUT=$(sunspot deploy "$vk_path" --cluster "$CLUSTER" -o "$so_path" 2>&1)
        PROGRAM_ID=$(echo "$OUTPUT" | grep -oE '[A-Za-z0-9]{32,44}' | head -1)

        if [ -n "$PROGRAM_ID" ]; then
            echo "           Program ID: $PROGRAM_ID"

            # Add to JSON
            if [ "$FIRST" = true ]; then
                FIRST=false
            else
                echo "," >> "$PROGRAM_IDS_FILE"
            fi
            echo -n "  \"$circuit\": \"$PROGRAM_ID\"" >> "$PROGRAM_IDS_FILE"
        else
            echo "           Warning: Could not extract program ID"
        fi
    else
        echo "  [SKIP] $circuit (VK not found - run setup-sunspot.sh first)"
    fi
done

echo "" >> "$PROGRAM_IDS_FILE"
echo "}" >> "$PROGRAM_IDS_FILE"

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "Program IDs: $PROGRAM_IDS_FILE"
echo "=========================================="
