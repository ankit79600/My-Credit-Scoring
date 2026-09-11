#!/usr/bin/env bash
# ================================================================
# deploy-contract.sh — Build and deploy the Soroban credit scoring contract
# Usage: ./scripts/deploy-contract.sh --secret <SECRET_KEY> [--mainnet]
# ================================================================

set -euo pipefail

NETWORK="testnet"
CONTRACT_DIR="contract"
WASM_PATH="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/contract.wasm"

SECRET_KEY=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --secret) SECRET_KEY="$2"; shift 2 ;;
    --mainnet) NETWORK="mainnet"; shift ;;
    *) shift ;;
  esac
done

if [[ -z "$SECRET_KEY" ]]; then
  SECRET_KEY="${STELLAR_SECRET_KEY:-}"
  if [[ -z "$SECRET_KEY" ]]; then
    echo "Usage: ./scripts/deploy-contract.sh --secret <YOUR_SECRET_KEY> [--mainnet]"
    echo "Or set STELLAR_SECRET_KEY env variable."
    exit 1
  fi
fi

if [[ "$NETWORK" == "mainnet" ]]; then
  echo ""
  echo "⚠️  WARNING: You are deploying to MAINNET. This uses real XLM."
  echo "   Press Ctrl+C within 5 seconds to cancel."
  sleep 5
fi

echo "==> Building Soroban contract (WASM)..."
(cd "$CONTRACT_DIR" && stellar contract build)

echo "==> Deploying to $NETWORK..."
CONTRACT_ADDRESS=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --network "$NETWORK" \
  --source "$SECRET_KEY" 2>&1 | tail -1)

echo ""
echo "✅ Contract deployed successfully!"
echo "   Network:          $NETWORK"
echo "   Contract Address: $CONTRACT_ADDRESS"
echo ""

if [[ "$NETWORK" == "mainnet" ]]; then
  echo "Next steps:"
  echo "  1. Initialize the contract:"
  echo "     stellar contract invoke --id $CONTRACT_ADDRESS --network mainnet --source <SECRET> -- initialize --admin <YOUR_G_ADDRESS>"
  echo ""
  echo "  2. Update your .env.local:"
  echo "     NEXT_PUBLIC_USE_MAINNET=true"
  echo "     NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
  echo ""
  echo "  3. Set the sponsor key for gasless transactions:"
  echo "     SPONSOR_SECRET_KEY=<SPONSOR_SECRET>"
  echo ""
  echo "  4. Push to Vercel — the new env vars will take effect on next deploy."
else
  echo "Update CONTRACT_ADDRESS in client/hooks/contract.ts:"
  echo "  export const CONTRACT_ADDRESS = \"$CONTRACT_ADDRESS\";"
fi
