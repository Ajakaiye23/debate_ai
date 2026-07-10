// Local-only API key entry form. Run with `npm run keys`.
// Serves a form on http://localhost:4599 and writes the values into `.env`.
// Binds to 127.0.0.1 only — nothing leaves your machine.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');
const PORT = 4599;

const FIELDS = [
  { key: 'EXPO_PUBLIC_ANTHROPIC_API_KEY', label: 'Anthropic API key', hint: 'console.anthropic.com → API Keys', secret: true },
  { key: 'EXPO_PUBLIC_OPENAI_API_KEY', label: 'OpenAI API key (Whisper)', hint: 'platform.openai.com → API Keys', secret: true },
  { key: 'EXPO_PUBLIC_ELEVENLABS_API_KEY', label: 'ElevenLabs API key', hint: 'elevenlabs.io → profile → API Keys', secret: true },
  { key: 'EXPO_PUBLIC_ELEVENLABS_VOICE_ID', label: 'ElevenLabs voice ID', hint: 'elevenlabs.io → Voices → copy a voice ID', secret: false },
  { key: 'EXPO_PUBLIC_FIREBASE_API_KEY', label: 'Firebase API key (optional)', hint: 'multiplayer only — leave blank', secret: true },
  { key: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', label: 'Firebase project ID (optional)', hint: 'multiplayer only — leave blank', secret: false },
  { key: 'EXPO_PUBLIC_FIREBASE_DATABASE_URL', label: 'Firebase database URL (optional)', hint: 'multiplayer only — leave blank', secret: false },
];

function readEnv() {
  const out = {};
  if (existsSync(ENV_PATH)) {
    for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  }
  return out;
}

function writeEnv(values) {
  const lines = [
    '# Written by `npm run keys`. Gitignored — keep it local.',
    ...FIELDS.map((f) => `${f.key}=${(values[f.key] ?? '').trim()}`),
  ];
  writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf8');
}

function esc(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function page(values, saved) {
  const rows = FIELDS.map((f) => {
    const val = esc(values[f.key] ?? '');
    return `
      <label class="field">
        <span class="label">${f.label}</span>
        <span class="hint">${f.hint}</span>
        <span class="inputwrap">
          <input name="${f.key}" value="${val}" type="${f.secret ? 'password' : 'text'}"
                 autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Not set" />
          ${f.secret ? '<button type="button" class="peek" tabindex="-1">show</button>' : ''}
        </span>
      </label>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DebateAI — API keys</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #160022; color: #F0DDFF;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      display: flex; justify-content: center; padding: 40px 16px; }
    .card { width: 100%; max-width: 560px; background: #1F0030;
      border: 1px solid rgba(255,94,224,0.20); border-radius: 20px; padding: 28px; }
    h1 { margin: 0 0 4px; font-size: 26px; color: #FF5EE0; }
    .sub { margin: 0 0 24px; color: #A878CC; font-size: 14px; }
    .field { display: block; margin-bottom: 18px; }
    .label { display: block; font-size: 13px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: #A878CC; }
    .hint { display: block; font-size: 12px; color: #5A3A7A; margin: 2px 0 8px; }
    .inputwrap { position: relative; display: flex; }
    input { flex: 1; background: #2A0040; border: 1px solid rgba(255,94,224,0.20);
      border-radius: 12px; padding: 12px 14px; color: #F0DDFF; font-size: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    input:focus { outline: none; border-color: #FF5EE0; }
    .peek { position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: #85C2FF; font-size: 12px; cursor: pointer; }
    button.save { width: 100%; margin-top: 8px; background: #FF5EE0; color: #0E0016;
      border: none; border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer; }
    .ok { background: rgba(68,255,136,0.10); border: 1px solid rgba(68,255,136,0.30);
      color: #44FF88; border-radius: 12px; padding: 10px 14px; margin-bottom: 20px; font-size: 14px; }
    .note { margin-top: 18px; font-size: 12px; color: #5A3A7A; line-height: 1.5; }
  </style></head>
  <body>
    <form class="card" method="POST" action="/save">
      <h1>DebateAI keys</h1>
      <p class="sub">Saved locally to <code>.env</code>. This page only runs on your machine.</p>
      ${saved ? '<div class="ok">Saved to .env ✓ &nbsp;Restart <code>expo start</code> to pick up changes.</div>' : ''}
      ${rows}
      <button class="save" type="submit">Save to .env</button>
      <p class="note">Tip: you can also enter these on the in-app Settings screen instead.
      If you ever pasted a key somewhere public, revoke it and generate a new one.</p>
    </form>
    <script>
      for (const b of document.querySelectorAll('.peek')) {
        b.addEventListener('click', () => {
          const i = b.previousElementSibling;
          const showing = i.type === 'text';
          i.type = showing ? 'password' : 'text';
          b.textContent = showing ? 'show' : 'hide';
        });
      }
    </script>
  </body></html>`;
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const values = {};
      for (const pair of body.split('&')) {
        const [k, v = ''] = pair.split('=');
        values[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
      }
      writeEnv(values);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page(readEnv(), true));
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page(readEnv(), false));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ✓ Key setup running at  http://localhost:${PORT}\n`);
  console.log('  Open that URL in your browser, paste your keys, and click Save.');
  console.log('  Press Ctrl+C here when you are done.\n');
});
