#!/usr/bin/env bash
# Puts your Razorpay keys on the live server (gkautobook.cloud) and switches online payment on.
# Run it yourself in Git Bash:   bash deploy/razorpay/set-razorpay-keys.sh
# The keys are typed here (hidden), sent over SSH, and written only into the server's .env files.
set -euo pipefail
cd "$(dirname "$0")"
KEY="${GK_SSH_KEY:-$HOME/.ssh/gk_deploy}"
HOST="root@187.127.151.21"

echo "Razorpay Dashboard -> Account & Settings -> API Keys -> Generate Key"
echo
read -r -p "Key ID (starts with rzp_live_ or rzp_test_): " KID
[[ "$KID" =~ ^rzp_(live|test)_[A-Za-z0-9]{8,40}$ ]] || { echo "That does not look like a Razorpay Key ID."; exit 1; }
read -r -s -p "Key Secret (hidden): " KSEC; echo
[[ "$KSEC" =~ ^[A-Za-z0-9]{16,64}$ ]] || { echo "That does not look like a Razorpay Key Secret."; exit 1; }
echo
echo "Webhook secret: the text you type in Razorpay -> Webhooks -> Secret."
echo "Press Enter to keep the one already on the server."
read -r -s -p "Webhook secret (hidden, optional): " WSEC; echo
if [[ -n "$WSEC" && ! "$WSEC" =~ ^[^[:space:]]{8,128}$ ]]; then echo "Webhook secret must be 8+ characters, no spaces."; exit 1; fi

[[ "$KID" == rzp_test_* ]] && echo "Note: TEST key - no real money will be charged."
read -r -p "Install these on the LIVE server now? (yes/no): " OK
[[ "$OK" == "yes" ]] || { echo "Cancelled, nothing changed."; exit 0; }

scp -q -i "$KEY" remote-set-keys.sh "$HOST:/root/app/remote-set-keys.sh"
printf '%s\n%s\n%s\n' "$KID" "$KSEC" "$WSEC" | ssh -i "$KEY" "$HOST" 'bash /root/app/remote-set-keys.sh; rc=$?; rm -f /root/app/remote-set-keys.sh; exit $rc'
