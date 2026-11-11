#!/usr/bin/env bash
# Runs ON THE SERVER (called by set-razorpay-keys.sh). Reads the keys from stdin, never from arguments,
# so they do not appear in shell history or the process list.
set -euo pipefail
IFS= read -r KID
IFS= read -r KSEC
IFS= read -r WSEC

APP=/root/app
TS=$(date +%Y%m%d-%H%M%S)
B=/root/backups/env-before-razorpay-$TS
mkdir -p "$B"
cp "$APP/server/.env" "$B/server.env"
cp "$APP/client/.env" "$B/client.env"
chmod 600 "$B"/*
echo "Backup of both .env files: $B"

export KID KSEC WSEC
node - <<'NODE'
const fs = require('fs');
function setVars(file, vars) {
  let t = fs.readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(vars)) {
    if (!v) continue; // empty = keep what is there
    const re = new RegExp('^' + k + '=.*$', 'm');
    const line = k + '=' + v;
    if (re.test(t)) t = t.replace(re, () => line);
    else { if (t && !t.endsWith('\n')) t += '\n'; t += line + '\n'; }
  }
  fs.writeFileSync(file, t);
}
const { KID, KSEC, WSEC } = process.env;
setVars('/root/app/server/.env', { RAZORPAY_KEY_ID: KID, RAZORPAY_KEY_SECRET: KSEC, RAZORPAY_WEBHOOK_SECRET: WSEC });
setVars('/root/app/client/.env', { VITE_RAZORPAY_KEY_ID: KID });
console.log('Keys saved (values not shown).');
NODE

echo "Rebuilding website with the public key..."
cd "$APP/client"
npm run build >/tmp/gk-build.log 2>&1 || { echo "BUILD FAILED - website unchanged. See /tmp/gk-build.log"; exit 1; }
cp -r dist/. /var/www/gkauto/
chown -R www-data:www-data /var/www/gkauto

echo "Restarting API..."
pm2 restart gk-backend --update-env >/dev/null
sleep 5
pm2 ls | grep gk-backend

code=$(curl -s -o /dev/null -w '%{http_code}' https://gkautobook.cloud/api/settings/public)
echo "API check: $code"
if grep -q "rzp_live_" /var/www/gkauto/assets/index-*.js 2>/dev/null && [[ "$KID" == rzp_live_* ]]; then
  echo "DONE: website now uses the LIVE Razorpay key. Online payments are switched on."
elif [[ "$KID" == rzp_test_* ]]; then
  echo "DONE: TEST mode key installed - payments are simulated, no real money moves."
fi
echo "To undo: cp $B/server.env $APP/server/.env && cp $B/client.env $APP/client/.env, then rebuild + pm2 restart gk-backend"
