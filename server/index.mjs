// Debate Me backend proxy — keeps the secret API keys off the client.
// Zero dependencies; runs on Node 18+ (uses global fetch / FormData / Blob).
//
// The app sends requests here with NO provider keys; this server adds them and
// forwards to Anthropic / OpenAI. Set the keys as environment variables (see
// .env.example) and run with `npm start`.
//
// Security posture (see SECURITY.md for the full rationale):
//   - shared app key gates every /api route (blocks drive-by abuse of the endpoint)
//   - per-IP rate limiting
//   - request body size caps
//   - model + max_tokens allowlist, so the endpoint can't be used as a free
//     pass-through to arbitrary expensive models
//   - upstream errors are summarised, never forwarded verbatim
//   - security headers + optional HTTPS enforcement

import http from 'node:http';

const PORT = process.env.PORT || 8787;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

// Shared secret the app must send as `x-app-key`. Set APP_KEY in the host's env
// and EXPO_PUBLIC_APP_KEY in the app. This is obfuscation-grade, not identity:
// it stops casual curl abuse of a public URL, but a determined attacker can
// extract it from the APK. Upgrade path: verify a Firebase App Check / ID token.
const APP_KEY = process.env.APP_KEY || '';

// Reject anything that isn't one of the models this app actually uses, so the
// proxy can never be repurposed as a free gateway to a pricier model.
const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-haiku-4-5',
  'claude-sonnet-4-6',
]);
const MAX_OUTPUT_TOKENS = 2048;

// Body size caps: JSON requests are small; audio is the only large payload.
const MAX_JSON_BYTES = 256 * 1024; // 256 KB
const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // 12 MB of base64 ≈ 9 MB of audio

// --- Rate limiting (per-IP, fixed window, in-memory) ------------------------
// Good enough for a single-instance free-tier deploy; resets if the process
// restarts. Move to a shared store (Redis) if this ever runs multi-instance.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20); // requests/IP/minute
const rateBuckets = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT_MAX;
}

// Periodically drop stale buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function baseHeaders(res) {
  // A mobile client sends no Origin; '*' here is not a CORS relaxation for any
  // browser app of ours, and the app key is what actually gates access.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-app-key');
  // Security headers — this API serves JSON/audio only, never HTML.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.FORCE_HTTPS === '1') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

/** Reads the body, aborting early if it exceeds `limit` bytes. */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  baseHeaders(res);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

/**
 * Map an upstream failure to a short, safe message. Never forward the raw
 * provider response — it can carry account/org details and internal hints.
 */
function upstreamError(res, status) {
  const message =
    status === 429
      ? 'The judge is busy right now. Try again in a moment.'
      : status === 401 || status === 403
        ? 'The server is not configured correctly.'
        : 'The judge could not be reached. Try again.';
  console.error(`[proxy] upstream failed with ${status}`);
  return sendJson(res, status === 429 ? 429 : 502, { error: message });
}

const server = http.createServer(async (req, res) => {
  baseHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Redirect plain HTTP to HTTPS when running behind a proxy that reports it.
  if (process.env.FORCE_HTTPS === '1' && req.headers['x-forwarded-proto'] === 'http') {
    const host = req.headers.host || '';
    res.writeHead(301, { location: `https://${host}${req.url}` });
    res.end();
    return;
  }

  // Health check — no auth, no secrets, useful for uptime pings.
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Debate Me proxy is running.');
    return;
  }

  if (!req.url?.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });

  // --- gate every API route -------------------------------------------------
  if (APP_KEY && req.headers['x-app-key'] !== APP_KEY) {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!checkRateLimit(clientIp(req))) {
    return sendJson(res, 429, { error: 'Too many requests, slow down.' });
  }

  try {
    // --- Anthropic (fact-check, verdict, AI argument) -----------------------
    if (req.url === '/api/anthropic') {
      if (!ANTHROPIC_KEY) return sendJson(res, 500, { error: 'Server not configured.' });

      const raw = await readBody(req, MAX_JSON_BYTES);
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8') || '{}');
      } catch {
        return sendJson(res, 400, { error: 'Malformed request.' });
      }

      // Validate and rebuild the request rather than forwarding it blindly —
      // the client only gets to choose an allowlisted model and its messages.
      if (!ALLOWED_MODELS.has(payload.model)) {
        return sendJson(res, 400, { error: 'Unsupported model.' });
      }
      if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
        return sendJson(res, 400, { error: 'Missing messages.' });
      }
      const safeBody = {
        model: payload.model,
        max_tokens: Math.min(Number(payload.max_tokens) || 1024, MAX_OUTPUT_TOKENS),
        messages: payload.messages,
      };
      if (payload.output_config) safeBody.output_config = payload.output_config;

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(safeBody),
      });
      if (!upstream.ok) return upstreamError(res, upstream.status);

      const text = await upstream.text();
      baseHeaders(res);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(text);
      return;
    }

    // --- OpenAI Whisper (transcription) -------------------------------------
    if (req.url === '/api/transcribe') {
      if (!OPENAI_KEY) return sendJson(res, 500, { error: 'Server not configured.' });

      const raw = await readBody(req, MAX_AUDIO_BYTES);
      let json;
      try {
        json = JSON.parse(raw.toString('utf8') || '{}');
      } catch {
        return sendJson(res, 400, { error: 'Malformed request.' });
      }
      const { audioBase64 } = json;
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return sendJson(res, 400, { error: 'audioBase64 required' });
      }

      // Never trust a client-supplied filename or MIME type — derive both.
      const bytes = Buffer.from(audioBase64, 'base64');
      if (bytes.length === 0) return sendJson(res, 400, { error: 'Empty audio.' });

      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'audio/m4a' }), 'audio.m4a');
      form.append('model', 'whisper-1');
      form.append('language', 'en');

      const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: form,
      });
      if (!upstream.ok) return upstreamError(res, upstream.status);

      // Return only the transcript field, not the full upstream object.
      const data = await upstream.json();
      return sendJson(res, 200, { text: String(data?.text ?? '') });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    if (e && e.message === 'payload_too_large') {
      return sendJson(res, 413, { error: 'Request too large.' });
    }
    // Log server-side, return a generic message to the client.
    console.error('[proxy] error:', e);
    return sendJson(res, 500, { error: 'Something went wrong.' });
  }
});

server.listen(PORT, () => {
  console.log(`Debate Me proxy listening on http://localhost:${PORT}`);
});
