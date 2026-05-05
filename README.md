# Local Messenger

A small private chatroom you self-host. PWA-friendly on Android, iPhone, and desktop. HTTPS in transit (you bring the proxy), SQLCipher at rest. Designed to run as a single Node process behind something like Tailscale Funnel, Cloudflare Tunnel, or a reverse proxy with Let's Encrypt.

A passphrase keeps strangers out. There's no end-to-end encryption — the server can read messages by design (single-tenant, single-room).

<p align="center">
  <img src="docs/screenshot.jpeg" alt="Connect screen with eight animal avatars" width="360" />
</p>

## Features

- One shared room, multiple participants, real-time via Socket.io
- Web Push notifications (VAPID) — works on iOS once installed to home screen
- Image attachments with thumbnails, HEIC auto-converted client-side
- 30-day message retention with periodic sweep
- 8 cute animal avatars: fox, owl, cat, raccoon, frog, bear, hedgehog, penguin
- Encrypted-at-rest SQLite via SQLCipher
- PWA with offline shell and pending-message queue

## Develop locally

```bash
cp .env.example .env
# Fill in:
#   ROOM_PASSPHRASE=<choose a passphrase>
#   SQLCIPHER_KEY=$(openssl rand -hex 32)
#   VAPID_PUBLIC + VAPID_PRIVATE: npx web-push generate-vapid-keys --json
#   VAPID_SUBJECT=mailto:you@example.com

npm install
npm run build

# In two terminals:
npm run dev:server   # 127.0.0.1:3000
npm run dev:client   # http://127.0.0.1:5173 (proxies /api, /media, /socket.io)
```

## Deploy (systemd + your own HTTPS proxy)

The included installer is intentionally minimal: it writes secrets to `/etc/local-messenger/env`, builds the app, and registers a systemd unit. It does **not** set up TLS — you bring your own proxy.

```bash
./deploy/install.sh
```

The installer will:

1. Prompt for a room passphrase
2. Generate a SQLCipher key and VAPID keypair
3. Ask for a VAPID subject (a `mailto:` or `https:` URL push providers can contact)
4. Render the systemd unit with the current user and repo path
5. Build, install, and start the service on `127.0.0.1:3000`

Then expose port 3000 to the public somehow. Two options:

**Tailscale Funnel** (path-scoped under `/chat`):

```bash
sudo tailscale funnel --bg --set-path /chat 3000
```

In `.env`, set `PUBLIC_BASE_PATH=/chat` and `VITE_BASE_PATH=/chat/` so the client and the URLs the server emits match the public path. Rebuild after changing those.

**Reverse proxy** (Caddy, nginx, etc.) terminating TLS with Let's Encrypt and forwarding to `127.0.0.1:3000` — leave `PUBLIC_BASE_PATH` and `VITE_BASE_PATH` empty if mounted at the root.

### Installing on iOS / Android

1. Open the URL in Safari/Chrome.
2. **Share → Add to Home Screen.**
3. Open from the home-screen icon (this matters for iOS push to fire).
4. On the connect screen, pick an avatar, type a name, enter the passphrase.
5. Tap "Enable" on the push banner.

## Smoke checklist

- [ ] `curl -X POST .../api/connect` with the correct passphrase returns 200 + Set-Cookie
- [ ] Two browsers connect with different names; messages broadcast both ways
- [ ] Same name reconnecting kicks the older session
- [ ] Reload — last 50 messages persist
- [ ] Upload photo (library + camera); thumb shows, full opens
- [ ] HEIC photo from iPhone works (client-side conversion)
- [ ] Add to Home Screen on Android Chrome — push fires
- [ ] Add to Home Screen on iPhone, launch from icon — push fires
- [ ] Disable network briefly: composer disables, queue holds, restoring flushes
- [ ] Insert a message dated 31 days ago, run sweep — gone

## Backups

Back up `/etc/local-messenger/env` and the `data.db` file in your install root. **Losing `SQLCIPHER_KEY` destroys all messages permanently.**

## Threat model

- HTTPS via your proxy covers in-transit encryption.
- A shared `ROOM_PASSPHRASE` keeps strangers out (the URL is technically discoverable).
- SQLCipher with a 256-bit hex key encrypts the entire DB (messages, sessions, image BLOBs).
- The env file is written `0640 root:<service-user>`. A live attacker with shell as the service user can read it; that's outside scope.
- No E2E encryption — the server reads plaintext by design.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node 20 |
| HTTP | Fastify (cookie, rate-limit, multipart, static) |
| Realtime | Socket.io |
| DB | SQLCipher via `better-sqlite3-multiple-ciphers` |
| Image processing | `sharp` |
| Push | `web-push` (server) + `PushManager` (client) |
| Frontend | React 18 + Vite + TypeScript |
| PWA | `vite-plugin-pwa` (Workbox, injectManifest) |
| HEIC | `heic2any` (client-side) |
| Tests | `vitest`, `@testing-library/react` |

## License

MIT — see [LICENSE](LICENSE).
