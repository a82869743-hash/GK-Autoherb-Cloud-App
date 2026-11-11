#!/usr/bin/env bash
# Puts the Firebase service-account key on the live server so it can send push notifications to the
# Android app. Run it yourself in Git Bash:   bash deploy/firebase/set-firebase-key.sh
# Firebase Console -> Project settings -> Service accounts -> Generate new private key (downloads a .json).
set -euo pipefail
KEY="${GK_SSH_KEY:-$HOME/.ssh/gk_deploy}"
HOST="root@187.127.151.21"
DEST=/root/app/server/firebase-service-account.json

DEFAULT=$(ls -t "$HOME"/Downloads/*firebase-adminsdk*.json "$HOME"/Desktop/*firebase-adminsdk*.json 2>/dev/null | head -1 || true)
if [[ -n "$DEFAULT" ]]; then
  echo "Found: $DEFAULT"
  read -r -p "Use this file? (yes / or type another path): " P
  if [[ -z "$P" || "$P" =~ ^([yY]|[yY][eE][sS])$ ]]; then FILE="$DEFAULT"; else FILE="$P"; fi
else
  read -r -p "Path to the Firebase service-account .json file: " FILE
fi
FILE="${FILE//\"/}"
[[ -f "$FILE" ]] || { echo "File not found: $FILE"; exit 1; }
grep -q '"type": *"service_account"' "$FILE" && grep -q '"private_key"' "$FILE" \
  || { echo "That is not a Firebase service-account key (google-services.json goes in the app, not here)."; exit 1; }
PROJECT=$(grep -o '"project_id": *"[^"]*"' "$FILE" | sed 's/.*"\([^"]*\)"$/\1/')
echo "Firebase project: $PROJECT"
read -r -p "Install on the LIVE server now? (yes/no): " OK
[[ "$OK" == "yes" ]] || { echo "Cancelled, nothing changed."; exit 0; }

ssh -i "$KEY" "$HOST" "umask 077; cat > $DEST.new" < "$FILE"
ssh -i "$KEY" "$HOST" bash -s <<REMOTE
set -e
cd /root/app/server
TS=\$(date +%Y%m%d-%H%M%S); mkdir -p /root/backups/env-before-firebase-\$TS
cp .env /root/backups/env-before-firebase-\$TS/server.env; chmod 600 /root/backups/env-before-firebase-\$TS/server.env
mv $DEST.new $DEST; chmod 600 $DEST
if grep -qE '^FIREBASE_SERVICE_ACCOUNT=' .env; then sed -i 's|^FIREBASE_SERVICE_ACCOUNT=.*|FIREBASE_SERVICE_ACCOUNT=$DEST|' .env; else printf '\nFIREBASE_SERVICE_ACCOUNT=$DEST\n' >> .env; fi
node -e "const a=require('firebase-admin');a.initializeApp({credential:a.credential.cert(require('$DEST'))});a.app().options.credential.getAccessToken().then(()=>{console.log('Firebase key works');process.exit(0)}).catch(e=>{console.log('Firebase key REJECTED: '+e.message);process.exit(1)})"
pm2 restart gk-backend --update-env >/dev/null; sleep 4; pm2 ls | grep gk-backend
echo "Backup of .env: /root/backups/env-before-firebase-\$TS"
echo "DONE: server can now send push notifications to the Android app."
REMOTE
