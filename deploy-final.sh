#!/bin/bash
echo "Waiting 3 minutes for RPC rate limits to fully reset..."
sleep 180
echo "Deploying program..."
solana program deploy target/deploy/cloakcraft.so --program-id fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP
