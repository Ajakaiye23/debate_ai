# Debate Me proxy

A tiny, zero-dependency Node server that holds your secret API keys and forwards
requests to Anthropic and OpenAI (Whisper). The app talks to this server instead
of calling those APIs directly, so the keys never ship inside the app.

## Why
`EXPO_PUBLIC_*` keys are bundled into the app and can be extracted by anyone who
downloads it. Before publishing to the app stores — or handing the app to anyone
else — move the keys here.

## Endpoints
- `GET  /` — health check. No auth, no secrets; returns `Debate Me proxy is running.`
- `POST /api/anthropic` — body is the raw Anthropic `messages` payload → adds the key, forwards.
- `POST /api/transcribe` — body `{ audioBase64, name, type }` → forwards to Whisper, returns `{ text }`.

Every `/api/` route requires the `x-app-key` header (see `APP_KEY` below).

## What it enforces
So a leaked proxy URL can't be used as a free gateway to someone else's bill:

- **Shared-secret gate** — `x-app-key` must match `APP_KEY` on every `/api/` route.
- **Model allowlist** — only `claude-haiku-4-5-20251001`, `claude-haiku-4-5` and
  `claude-sonnet-4-6` are accepted; anything else is a 400.
- **Output clamp** — `max_tokens` is capped at 2048 regardless of what the caller asks for.
- **Body-size caps** — 256 KB of JSON, 12 MB of base64 audio, aborted early once exceeded.
- **Rate limiting** — 20 requests/minute per IP (in-memory, resets on restart — fine for a
  single free-tier instance). Tune with `RATE_LIMIT_MAX`.
- **Upstream errors are summarised**, not forwarded, so provider responses can't leak out.
- **Security headers**, plus optional http→https redirect + HSTS with `FORCE_HTTPS=1`.

## Environment variables
| Variable | Required | What it's for |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | What the judging runs on |
| `APP_KEY` | yes | Long random string; the app sends it as `x-app-key`. Without it the proxy is open to anyone who finds the URL |
| `OPENAI_API_KEY` | no | Cloud speech-to-text only; the app falls back to on-device speech recognition |
| `RATE_LIMIT_MAX` | no | Requests per IP per minute (default 20) |
| `FORCE_HTTPS` | no | `1` behind a TLS-terminating host such as Render |
| `PORT` | no | Defaults to 8787; hosts usually set this for you |

## Run locally
```bash
cd server
node --env-file=.env index.mjs    # .env holding the variables above (Node 20+)
```

Server prints `Debate Me proxy listening on http://localhost:8787`.

## Point the app at it
In the app's `.env`:
```
EXPO_PUBLIC_PROXY_URL=http://<your-computer-ip>:8787
EXPO_PUBLIC_APP_KEY=<the same value as APP_KEY above>
```
Then clear `EXPO_PUBLIC_ANTHROPIC_API_KEY` and `EXPO_PUBLIC_OPENAI_API_KEY` from the
app's `.env` — the app no longer needs them.

> A player who pastes their **own** Anthropic key on the Settings screen still calls
> Anthropic directly on their own account, bypassing the proxy by design.

## Deploy to Render (one-click via blueprint)
A `render.yaml` at the repo root already describes this service.
1. Push this repo to GitHub (if not already).
2. On [render.com](https://render.com), **New → Blueprint**, connect the repo. Render reads
   `render.yaml` and creates the `debateme-proxy` web service automatically (free plan,
   root dir `server`).
3. Render asks for the values marked `sync: false`: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
   (may be left blank) and `APP_KEY` (invent a 30+ character random string).
4. Deploy. Render gives you a URL like `https://debateme-proxy.onrender.com`.
5. Put that URL and the same `APP_KEY` into the app's `.env` as above.

Free-tier Render services spin down when idle and take ~30s to wake on the next
request — fine for testing, consider a paid instance before a real launch.

Railway and Fly.io work the same way without the blueprint (any host that runs
`npm start` in `server/` works) — set the same variables in their dashboard.
