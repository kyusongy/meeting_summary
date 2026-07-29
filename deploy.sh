#!/usr/bin/env bash
# Build locally and ship the standalone server to the Oracle VM.
# The box has under 1 GB of RAM and cannot run `next build` itself.
set -euo pipefail

HOST="${DEPLOY_HOST:-oracle}"
APP_DIR=/opt/meeting-notes
ENV_FILE=/etc/meeting-notes.env

cd "$(dirname "$0")"

echo "==> Building"
npm run build

echo "==> Assembling standalone bundle"
# next build emits these outside .next/standalone; the server needs them beside it.
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

echo "==> Uploading to $HOST:$APP_DIR"
ssh "$HOST" "sudo mkdir -p $APP_DIR && sudo chown ubuntu:ubuntu $APP_DIR"
rsync -az --delete .next/standalone/ "$HOST:$APP_DIR/"

echo "==> Installing environment"
# Root-only; systemd reads it before dropping to the ubuntu user.
scp -q .env.local "$HOST:/tmp/meeting-notes.env"
ssh "$HOST" "sudo install -m 600 -o root -g root /tmp/meeting-notes.env $ENV_FILE && rm -f /tmp/meeting-notes.env"

echo "==> Restarting service"
ssh "$HOST" "sudo systemctl restart meeting-notes && sleep 2 && systemctl is-active meeting-notes"

echo "==> Health check"
ssh "$HOST" "curl -sf -o /dev/null -w 'login page: %{http_code}\n' http://127.0.0.1:3000/login"

echo "==> Done"
