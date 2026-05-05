# Deployment examples

The server itself binds `127.0.0.1:3000` and is proxy-agnostic. The only
deployment-specific knobs are three env vars that control how the public path
is exposed to the browser:

| Var | Root-mount | Path-mount (e.g. `/chat`) |
|---|---|---|
| `BASE_PATH` | empty | empty if proxy strips prefix, `/chat` if it forwards as-is |
| `PUBLIC_BASE_PATH` | empty | `/chat` |
| `VITE_BASE_PATH` | `/` | `/chat/` (trailing slash) |

After changing `VITE_BASE_PATH`, **rebuild the client** (`npm run build`) so the
correct base is baked into the bundle.

## Examples in this directory

| File | Use when |
|---|---|
| [`Caddyfile`](Caddyfile) | You want the easiest possible TLS — Caddy auto-issues + renews Let's Encrypt certs. ~3 lines of config. |
| [`nginx.conf`](nginx.conf) | You already run nginx, or want fine-grained control. Pair with `certbot` for TLS. |
| [`cloudflared.yml`](cloudflared.yml) | Host has no public IP, or you want Cloudflare DDoS / edge caching. TLS terminates at Cloudflare. |

For Tailscale Funnel (path-mounted at `/chat`), see the main [README](../../README.md#deploy-systemd--your-own-https-proxy).

## What the upstream proxy needs to do

Whatever proxy you pick, three requirements:

1. **Forward to `127.0.0.1:3000`** (or whatever `PORT` is set to).
2. **Pass through WebSocket upgrades** (`Upgrade` / `Connection: upgrade` headers preserved). Socket.io will fall back to long-polling if WS is blocked, but real-time presence and typing indicators are noticeably worse.
3. **Allow request bodies up to ~25 MB** for image uploads. HEIC photos from iPhones can be large.
