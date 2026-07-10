// DebateAI backend proxy — keeps the secret API keys off the client.
// Zero dependencies; runs on Node 18+ (uses global fetch / FormData / Blob).
//
// The app sends requests here with NO keys; this server adds them and forwards
// to Anthropic / OpenAI / ElevenLabs. Set the keys as environment variables
// (see .env.example) and run with `npm start`.

import http from 'node:http';

const PORT = process.env.PORT || 8787;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';

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

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  cors(res);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('DebateAI proxy is running.');
    return;
  }

  if (req.method === 'POST' && !checkRateLimit(clientIp(req))) {
    return sendJson(res, 429, { error: 'Too many requests, slow down.' });
  }

  try {
    // --- Anthropic (fact-check, verdict, AI argument) -------------------------
    if (req.method === 'POST' && req.url === '/api/anthropic') {
      if (!ANTHROPIC_KEY) return sendJson(res, 500, { error: 'Server missing ANTHROPIC_API_KEY' });
      const body = await readBody(req); // raw {model, max_tokens, messages}
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body,
      });
      const text = await upstream.text();
      cors(res);
      res.writeHead(upstream.status, { 'content-type': 'application/json' });
      res.end(text);
      return;
    }

    // --- OpenAI Whisper (transcription) --------------------------------------
    if (req.method === 'POST' && req.url === '/api/transcribe') {
      if (!OPENAI_KEY) return sendJson(res, 500, { error: 'Server missing OPENAI_API_KEY' });
      const json = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const { audioBase64, name = 'audio.m4a', type = 'audio/m4a' } = json;
      if (!audioBase64) return sendJson(res, 400, { error: 'audioBase64 required' });
      const bytes = Buffer.from(audioBase64, 'base64');
      const form = new FormData();
      form.append('file', new Blob([bytes], { type }), String(name));
      form.append('model', 'whisper-1');
      form.append('language', 'en');
      const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: form,
      });
      const text = await upstream.text();
      cors(res);
      res.writeHead(upstream.status, { 'content-type': 'application/json' });
      res.end(text);
      return;
    }

    // --- ElevenLabs (text-to-speech) -----------------------------------------
    if (req.method === 'POST' && req.url === '/api/tts') {
      if (!ELEVEN_KEY) return sendJson(res, 500, { error: 'Server missing ELEVENLABS_API_KEY' });
      const json = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const { text, voiceId } = json;
      if (!voiceId) return sendJson(res, 400, { error: 'voiceId required' });
      const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVEN_KEY,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          // Flash: half the credits per character of the classic models, much lower latency.
          model_id: 'eleven_flash_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });
      if (!upstream.ok) {
        const errText = await upstream.text();
        cors(res);
        res.writeHead(upstream.status, { 'content-type': 'application/json' });
        res.end(errText);
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      cors(res);
      res.writeHead(200, { 'content-type': 'audio/mpeg' });
      res.end(buf);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    sendJson(res, 500, { error: String((e && e.message) || e) });
  }
});

server.listen(PORT, () => {
  console.log(`DebateAI proxy listening on http://localhost:${PORT}`);
});
