#!/bin/bash
set -e

echo "CloakCraft Program Deployment Script"
echo "====================================="
echo ""

PROGRAM_ID="fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP"
PROGRAM_PATH="target/deploy/cloakcraft.so"

# Check if program exists
if [ ! -f "$PROGRAM_PATH" ]; then
    echo "Error: Program file not found at $PROGRAM_PATH"
    echo "Run 'cargo build-sbf' first"
    exit 1
fi

# Set RPC to public devnet
solana config set --url https://api.devnet.solana.com

echo "Program ID: $PROGRAM_ID"
echo "Program Path: $PROGRAM_PATH"
echo ""
echo "Starting deployment (this may take a few minutes)..."
echo ""

# Deploy with retries
MAX_RETRIES=3
for i in $(seq 1 $MAX_RETRIES); do
    echo "Attempt $i of $MAX_RETRIES..."
    
    if solana program deploy "$PROGRAM_PATH" --program-id "$PROGRAM_ID"; then
        echo ""
        echo "✅ Deployment successful!"
        echo "Program ID: $PROGRAM_ID"
        exit 0
    else
        if [ $i -lt $MAX_RETRIES ]; then
            echo "Deployment failed. Waiting 30 seconds before retry..."
            sleep 30
        fi
    fi
done

echo ""
echo "❌ Deployment failed after $MAX_RETRIES attempts"
echo "Please try again later when RPC is less congested"
exit 1
