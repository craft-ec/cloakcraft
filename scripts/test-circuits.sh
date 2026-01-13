#!/bin/bash
# Test all Noir circuits
# Usage: ./scripts/test-circuits.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CIRCUITS_DIR="$ROOT_DIR/circuits"

echo "=========================================="
echo "CloakCraft Circuit Tests"
echo "=========================================="

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

PASSED=0
FAILED=0

echo ""
echo "Running tests..."
echo ""

for circuit in "${CIRCUITS[@]}"; do
    circuit_path="$CIRCUITS_DIR/$circuit"
    circuit_name=$(basename "$circuit")

    if [ -d "$circuit_path" ]; then
        echo -n "  [TEST] $circuit ... "
        cd "$circuit_path"
        if nargo test 2>&1 > /dev/null; then
            echo "PASSED"
            ((PASSED++))
        else
            echo "FAILED"
            ((FAILED++))
        fi
        cd "$ROOT_DIR"
    fi
done

echo ""
echo "=========================================="
echo "Results: $PASSED passed, $FAILED failed"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
    exit 1
fi
