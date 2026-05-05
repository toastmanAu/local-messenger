#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_USER="${SERVICE_USER:-$(id -un)}"
ENV_DIR=/etc/local-messenger
ENV_FILE="$ENV_DIR/env"
SERVICE_NAME=local-messenger.service
UNIT_TEMPLATE="$ROOT/deploy/local-messenger.service.template"
UNIT_RENDERED="$ROOT/deploy/local-messenger.service"

echo "[1/6] Installing dependencies"
cd "$ROOT"
npm install

echo "[2/6] Generating secrets if missing"
sudo mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_FILE" ]; then
  read -srp "Choose a room passphrase: " PASS; echo
  read -rp  "VAPID subject (mailto:you@example.com or https://your.site): " VSUB
  if [ -z "$VSUB" ]; then echo "VAPID subject is required" >&2; exit 1; fi

  KEY=$(openssl rand -hex 32)
  VAPID_JSON=$(npx --yes web-push generate-vapid-keys --json)
  VPUB=$(node -e "console.log(JSON.parse(process.argv[1]).publicKey)" "$VAPID_JSON")
  VPRIV=$(node -e "console.log(JSON.parse(process.argv[1]).privateKey)" "$VAPID_JSON")

  read -rp "Public base path (e.g. /chat for Tailscale Funnel, leave blank for root): " PUBPATH
  PUBPATH="${PUBPATH:-}"
  VITE_PATH="/"
  if [ -n "$PUBPATH" ]; then VITE_PATH="${PUBPATH%/}/"; fi

  sudo tee "$ENV_FILE" >/dev/null <<EOF
ROOM_PASSPHRASE=$PASS
SQLCIPHER_KEY=$KEY
VAPID_PUBLIC=$VPUB
VAPID_PRIVATE=$VPRIV
VAPID_SUBJECT=$VSUB
PORT=3000
DB_PATH=$ROOT/data.db
# BASE_PATH: server-internal prefix. Leave empty if the upstream proxy
# strips the public prefix before forwarding (e.g. tailscale funnel
# --set-path /chat strips /chat).
BASE_PATH=
# PUBLIC_BASE_PATH: prefix the browser sees. Used by the server when
# constructing image_url / push-icon URLs and for the session cookie path.
PUBLIC_BASE_PATH=$PUBPATH
STATIC_DIR=$ROOT/client/dist
VITE_BASE_PATH=$VITE_PATH
EOF
  sudo chown "root:$SERVICE_USER" "$ENV_FILE"
  sudo chmod 0640 "$ENV_FILE"
  echo "Wrote $ENV_FILE"
fi

echo "[3/6] Building (env vars loaded so VITE_BASE_PATH is honoured)"
set -a
# shellcheck disable=SC1090
source <(sudo cat "$ENV_FILE")
set +a
npm run build

echo "[4/6] Rendering systemd unit for user '$SERVICE_USER' at '$ROOT'"
sed \
  -e "s|__SERVICE_USER__|$SERVICE_USER|g" \
  -e "s|__SERVICE_ROOT__|$ROOT|g" \
  "$UNIT_TEMPLATE" > "$UNIT_RENDERED"

echo "[5/6] Installing and starting systemd unit"
sudo install -m 0644 "$UNIT_RENDERED" /etc/systemd/system/$SERVICE_NAME
sudo systemctl daemon-reload
sudo systemctl enable --now $SERVICE_NAME
sudo systemctl status --no-pager $SERVICE_NAME || true

echo
echo "[6/6] Expose 127.0.0.1:3000 publicly via your preferred TLS path."
echo "Examples:"
echo "  Tailscale Funnel (path-scoped):"
echo "    sudo tailscale funnel --bg --set-path /chat 3000"
echo "  Caddy / nginx: terminate TLS, reverse_proxy to 127.0.0.1:3000."
echo
echo "BACK UP $ENV_FILE — losing SQLCIPHER_KEY destroys all messages."
