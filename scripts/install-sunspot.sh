#!/bin/bash
# Install Sunspot - Noir to Groth16 conversion tool for Solana
# Usage: ./scripts/install-sunspot.sh
#
# Requirements:
# - Go 1.24+ (https://go.dev/dl/)
# - Noir 1.0.0-beta.13

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Installing Sunspot"
echo "=========================================="

# Check for Go installation
if ! command -v go &> /dev/null; then
    echo "Error: Go 1.24+ is required to build Sunspot"
    echo "Install Go from https://go.dev/dl/"
    exit 1
fi

GO_VERSION=$(go version | grep -oE 'go[0-9]+\.[0-9]+' | sed 's/go//')
echo "Go version: $(go version)"

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Clone Sunspot repository
echo ""
echo "Cloning Sunspot repository..."
git clone --depth 1 https://github.com/reilabs/sunspot.git "$TEMP_DIR/sunspot"

# Build Sunspot from the go subdirectory
echo ""
echo "Building Sunspot..."
cd "$TEMP_DIR/sunspot/go"
go build -o sunspot .

# Install to scripts directory
echo ""
echo "Installing to $SCRIPT_DIR/sunspot..."
cp "$TEMP_DIR/sunspot/go/sunspot" "$SCRIPT_DIR/sunspot"
chmod +x "$SCRIPT_DIR/sunspot"

# Also copy gnark-solana verifier for deployment
echo ""
echo "Copying gnark-solana verifier..."
if [ -d "$TEMP_DIR/sunspot/gnark-solana" ]; then
    cp -r "$TEMP_DIR/sunspot/gnark-solana" "$ROOT_DIR/gnark-solana"
    echo "Copied to $ROOT_DIR/gnark-solana"
fi

# Verify installation
echo ""
echo "Verifying installation..."
"$SCRIPT_DIR/sunspot" --help | head -10

echo ""
echo "=========================================="
echo "Sunspot installed successfully!"
echo "=========================================="
echo "Location: $SCRIPT_DIR/sunspot"
echo ""
echo "Note: For 'sunspot deploy' to work, set:"
echo "  export GNARK_VERIFIER_BIN=$ROOT_DIR/gnark-solana/verifier-bin"
echo "=========================================="
