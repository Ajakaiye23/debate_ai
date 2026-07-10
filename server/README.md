# DebateAI proxy

A tiny, zero-dependency Node server that holds your secret API keys and forwards
requests to Anthropic, OpenAI (Whisper), and ElevenLabs. The app talks to this
server instead of calling those APIs directly, so the keys never ship in the app.

## Why
`EXPO_PUBLIC_*` keys are bundled into the app and can be extracted by anyone who
downloads it. Before publishing to the web or app stores, move the keys here.

## Endpoints
- `POST /api/anthropic` — body is the raw Anthropic `messages` payload → adds the key, forwards.
- `POST /api/transcribe` — body `{ audioBase64, name, type }` → forwards to Whisper, returns `{ text }`.
- `POST /api/tts` — body `{ text, voiceId }` → forwards to ElevenLabs, returns `audio/mpeg` bytes.

## Run locally
```bash
cd server
cp .env.example .env      # then paste your keys into .env
node --env-file=.env index.mjs
```
(Node 18+; `--env-file` needs Node 20+. On older Node, set the env vars another way.)

Server prints `listening on http://localhost:8787`.

## Point the app at it
In the app's `.env`, set:
```
EXPO_PUBLIC_PROXY_URL=http://<your-computer-ip>:8787
```
When this is set, the app routes all AI calls through the proxy and ignores the
client-side keys. Remove the `EXPO_PUBLIC_ANTHROPIC/OPENAI/ELEVENLABS` keys from
the app `.env` once the proxy is in use.

## Rate limiting
Built in: 20 requests/minute per IP (in-memory, resets on restart — fine for a
single free-tier instance). Tune with the `RATE_LIMIT_MAX` env var.

## Deploy to Render (one-click via blueprint)
A `render.yaml` at the repo root already describes this service.
1. Push this repo to GitHub (if not already).
2. On [render.com](https://render.com), **New → Blueprint**, connect the repo. Render reads
   `render.yaml` and creates the `debateai-proxy` web service automatically (free plan,
   root dir `server`).
3. In the service's **Environment** tab, fill in the three secret values it left blank:
   `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`.
4. Deploy. Render gives you a URL like `https://debateai-proxy.onrender.com`.
5. In the app's `.env`, set `EXPO_PUBLIC_PROXY_URL` to that URL, and remove the
   `EXPO_PUBLIC_ANTHROPIC/OPENAI/ELEVENLABS` keys.

Free-tier Render services spin down when idle and take ~30s to wake on the next
request — fine for testing, consider a paid instance before a real launch.

Railway and Fly.io work the same way without the blueprint (any host that runs
`npm start` in `server/` works) — set the same three env vars in their dashboard.
