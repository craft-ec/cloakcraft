#!/bin/bash
echo "============================================"
echo "CloakCraft Deployment - Extended Wait"
echo "============================================"
echo ""
echo "Waiting 5 minutes to allow RPC rate limits to fully reset..."
echo "Started at: $(date)"
sleep 300
echo ""
echo "Wait complete. Starting deployment..."
echo "Deployment started at: $(date)"
solana program deploy target/deploy/cloakcraft.so --program-id fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP
exit_code=$?
echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed with exit code $exit_code"
fi
exit $exit_code
