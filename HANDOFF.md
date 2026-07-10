# DebateAI — Session Handoff

Paste this whole file into a new session to restore full context. It captures the
app, the hard-won environment setup, what's built/tested, and what's left to ship.

---

## 1. What the app is

**DebateAI** — an Expo (Expo Router, TypeScript) **mobile** app at `C:\Users\blkg2\debate_ai`.
Two players debate a topic they type in; an AI judge scores + fact-checks each turn and
reads a verdict aloud.

- **Speech-to-text:** OpenAI Whisper (via raw `fetch`)
- **Judge:** Anthropic Claude — model **`claude-sonnet-4-6`** (raw `fetch` to `/v1/messages`)
- **Text-to-speech:** ElevenLabs (raw `fetch`, played with `expo-audio`)
- **Styling:** React Native `StyleSheet` + `src/constants/theme.ts` ("Neon Dusk": violet bg,
  pink primary, blue accents). NOT NativeWind. A glowing SVG backdrop (`DuskBackground`) is
  behind every screen.

**Modes (all built):** Pass & Play, Solo vs AI ("Rival"), Formal Debate (2 humans), Online Multiplayer.

---

## 2. CRITICAL environment setup (read first)

This machine and sandbox have several non-obvious quirks that cost a lot of time:

- **No system Node.** Node is a **portable install inside the project**: `debate_ai/nodejs/`.
  It is NOT on PATH. To run any node/npm/npx, prepend it (PowerShell):
  ```powershell
  $env:Path = "C:\Users\blkg2\debate_ai\nodejs;$env:Path"
  ```
  The Bash tool reports `node: command not found`; use the **PowerShell tool** with the PATH
  prepend (or the absolute `nodejs\node.exe` / `nodejs\npx.cmd`).
- **Sandbox vs real disk.** The agent's shell runs sandboxed. The **`debate_ai` folder is a
  shared/real mount** (files appear for the user), but **`AppData` is NOT** — Node was
  originally installed to AppData and was invisible to the user's real machine, which is why
  it now lives inside the project. For any filesystem/network op that MUST hit the user's real
  disk, run the shell tool with **`dangerouslyDisableSandbox: true`** (a marker file written
  that way was visible to the user; plain sandboxed writes to AppData were not).
- **Expo SDK pinned to 54.** The user's Expo Go only supports SDK 54 — do NOT upgrade past it
  (you get "update Expo Go"). Stack: expo 54.0.35, react 19.1.0, react-native 0.81.5,
  expo-audio 1.1.1 (recording+playback; `expo-av` is gone), expo-file-system new `File`/`Paths`
  API (legacy at `expo-file-system/legacy`).
- **Running on a phone:** the user double-clicks `debate_ai/start.cmd` (sets PATH to `nodejs/`,
  runs `npx expo start --tunnel`). **Tunnel mode is required** because the user runs NordVPN
  (LAN broken); `@expo/ngrok` is installed **globally** under `nodejs/node_modules`. The
  terminal window IS the server — closing it kills the tunnel (phone shows `ERR_NGROK_3200`).
- **Verify changes** with `npx tsc --noEmit` + `npx expo export --platform android`.
- **Mobile-only.** Web support was removed (2026-07-07): no `web` block in `app.json`, no
  `react-dom`/`react-native-web` deps, no `web` npm script or favicon. All runtime testing is
  on a phone via `start.cmd` (tunnel). Do NOT re-add web targets.

---

## 3. Architecture notes

- **Segment engine.** A debate is a list of `Segment`s (`src/constants/format.ts` `buildSegments`),
  not rounds×players directly. `useDebateState` iterates `config.segments`. Two formats:
  - `quick` = rounds × [p1, p2]
  - `formal` = Opening (each) → **Cross-examination as a real Q&A** (P1 questions → P2 responds →
    P2 questions → P1 responds) → Closing. Each player has a `voiceId`, so read-backs use
    distinct ElevenLabs voices; setup forces the two players onto different voices.
- **Debate flow** is hands-free/auto-advancing (ready countdown → record → score → read aloud →
  break → next), with pause and a **"Type instead"** fallback (`submitTypedTurn`) that skips Whisper.
- **Services use `fetch`** (not the Node SDKs) for RN reliability, and support a **proxy toggle**:
  when `EXPO_PUBLIC_PROXY_URL` is set they route through the backend proxy; empty = direct calls
  with the bundled keys (`src/services/proxy.ts`).
- **Backend proxy** in `debate_ai/server/` (zero-dep Node `index.mjs`): holds secret keys
  server-side; endpoints `/api/anthropic`, `/api/transcribe` (base64 JSON), `/api/tts`. Built,
  NOT deployed.
- **Multiplayer** (`src/app/multiplayer.tsx` lobby, `mp-debate.tsx` turn-synced game,
  `leaderboard.tsx`) uses Firebase Realtime DB (`src/services/firebase.ts`), anonymous device-id
  identity (`src/store/identity.ts`), and ELO (`src/services/elo.ts`). Room = 6-char code; the
  active player scores on-device and pushes to the room; host computes the verdict; each client
  updates its own ELO. Turn timer auto-submits so a match can't stall.

---

## 4. API keys

In `debate_ai/.env` (gitignored, bundled via `EXPO_PUBLIC_`): Anthropic, OpenAI, ElevenLabs key +
voice id are set. Firebase vars are **blank** (multiplayer untested until set). In-app key entry
was removed; keys come from `.env`.
- ⚠️ The keys are bundled into the client build — fine for testing, must move behind the proxy
  before publishing.
- ⚠️ One Anthropic key was once pasted in chat and should be treated as compromised/rotated.

---

## 5. What's built & tested

**Built + verified working (was validated live on the now-removed web build):**
- Core scoring loop (the original skill's model id `claude-sonnet-4-20250514` was RETIRED
  2026-06-15 and 404'd — fixed to `claude-sonnet-4-6`). Real scores + fact-check + auto-advance
  confirmed.
- Home / setup / formal-setup screens, navigation, color scheme, glow background, mic-fail→retry
  fallback. No console errors.

**Added 2026-07-08 (compiles + bundles, not yet runtime-tested):**
- **2v2 formal debates**: 1v1/2v2 toggle in formal setup, team names, 14-segment format
  (openings → cross-ex → constructives → cross-ex 2 → closings by second speakers). Verdict
  names the winning team (`teamNames`/`winnerLabel` on the session).
- **Hidden voices**: voice pickers removed from setup; ElevenLabs voices are auto-assigned
  silently per speaker in formal mode so players can't see who maps to which voice.
- **Speed**: judge-prompt history truncates older turns (last 2 verbatim); verdict transcript
  capped at 600 chars/turn; Settings "Read turn scores aloud → Off (faster)" skips per-turn TTS.
- **Coaching**: per-turn `rebuttal` score + named `fallacies` chips on ArgumentCard; per-player
  coaching card (best moment + tip) from the verdict on the results screen.
- **Ads/IAP scaffolding (stubbed)**: `src/services/ads.ts` (post-debate interstitial no-op until
  react-native-google-mobile-ads + dev build + AdMob account) and `src/services/purchases.ts`
  (Remove ads $4.99 stub until RevenueCat + store accounts); `adFree` flag in settings; UI wired
  in Settings + results. Ads-based free tier replaces the earlier ElevenLabs-gating freemium idea.

**Added 2026-07-08, round 2 (compiles + bundles, not runtime-tested):**
- **Device TTS**: `expo-speech` installed; `src/services/tts.ts` routes all speech through
  ElevenLabs or the free on-device engine per the Settings "Voice engine" toggle
  (`ttsEngine` setting). debate/results screens now import `speak` from tts.ts.
- **Prep time**: formal setup offers None/1/2/5 min silent prep before openings
  (`prepSeconds` on config; 'prep' flow phase in debate.tsx with skip + pause).
- **AI speakers in 2v2**: any speaker except Player 1 can be toggled to AI in setup
  (`Player.isAI`; debate.tsx now keys AI turns off `isAI`, not `id === 'ai'`); AI difficulty
  section shows when any AI speaker is enabled.
- **On-device speech-to-text**: `expo-speech-recognition` installed (config plugin in
  app.json with mic + speech permissions). `src/services/stt.ts` wraps it with a guarded
  require — in Expo Go the native module is missing, so `startListening()` returns false and
  the debate flow automatically falls back to the old record→Whisper path. In a dev/EAS build
  speech transcribes live on-device: free, instant, offline; makes the OpenAI key optional.
  Not runtime-tested until the first dev build exists.
- **Cost cuts (2026-07-08)**: per-turn judging + AI arguments now use `claude-haiku-4-5-20251001`
  (verdict/coaching stays `claude-sonnet-4-6`; `output_config.effort` only sent on Sonnet —
  Haiku rejects it). ElevenLabs switched to `eleven_flash_v2_5` (half credits/char, faster) in
  both app + proxy.
- **Cleanup (2026-07-08)**: removed unused deps (@expo/ui, expo-glass-effect, expo-symbols,
  expo-image, expo-linear-gradient, expo-device), scripts/reset-project, start-lan.cmd, and
  stray log/marker files. UI polish pass on home screen + Primitives (glows, shadows, pressed
  scale).
- See `OWNER_GUIDE.md` for the human-required launch checklist (incl. §4½ — booting the app
  standalone without Expo Go via an EAS preview APK).

**Built, compiles + bundles, but NOT runtime-tested** (need a phone / 2 devices / live keys):
- On-device mic → Whisper, ElevenLabs voices (incl. formal cross-exam distinct voices)
- Full **multiplayer + ELO + leaderboard** (needs Firebase keys + two phones)

**Known external dependency:** Whisper voice input needs **OpenAI billing credits** (otherwise
429 `insufficient_quota`); "Type instead" bypasses it.

---

## 6. Shipping roadmap — where we are

Decided/done:
- **Cost model = Freemium** — Free: typed + on-device voice (`expo-speech`, $0) + judging, capped;
  Premium (~$3-5/mo via RevenueCat): ElevenLabs voices + spoken input + unlimited. (Per-debate
  cost is roughly $0.10 typed → ~$0.60 full-voice; ElevenLabs is the expensive part.)
- **Store-prep package done:** app icon + adaptive/splash/favicon (generated via `store/gen-icons.mjs`,
  `sharp` devDep), bundle id `com.ajakaiye.debateai` (iOS+Android) + build numbers in `app.json`,
  `eas.json` (dev/preview/production), `store/privacy-policy.html` (fill `[DATE]`, host it),
  `store/LISTING.md` (store copy).

Remaining (rough order):
1. **Implement freemium mechanics** — device-TTS free default + usage cap + a `premium` flag
   gating ElevenLabs/Whisper. (Paywall/RevenueCat comes after dev accounts.)
2. **Deploy the proxy** — host `server/` on Render/Railway/Fly (free), set keys there, set
   `EXPO_PUBLIC_PROXY_URL`, remove bundled keys, add rate-limiting. REQUIRED before public.
3. **Set up Firebase** (5 min: console.firebase.google.com → project → Realtime Database →
   add Web app → copy `apiKey`/`projectId`/`databaseURL` into `.env`) to test multiplayer.
4. **Screenshots** (device-resolution), host the privacy policy, write store listings.
5. **Developer accounts (user, payment):** Apple $99/yr, Google Play $25 one-time.
6. **EAS build + submit:** `eas build --platform all` (cloud, no Mac needed), TestFlight / Play
   internal testing, then `eas submit`. Lock down Firebase DB rules before public.

---

## 7. File map (under `src/`)

```
app/            index, setup, debate, results, history, settings,
                multiplayer, mp-debate, leaderboard, _layout
components/     Primitives (Screen/Button/Chip), DuskBackground, MicButton, TimerBar,
                ArgumentCard, ScoreBreakdown, ScorePill, VerdictBanner
services/       claude, whisper, elevenlabs, firebase, proxy, elo
hooks/          useDebateState (segment engine), useAudioRecorder, useTimer
store/          settings, identity, debateHistory, activeDebate
constants/      theme, prompts, format, voices
types/          debate.ts
utils/          json.ts (safe model-JSON parse)
```
Other: `server/` (proxy), `store/` (icon gen + privacy policy + listing), `start.cmd`
(tunnel launcher), `SKILL.md` (original build playbook), `HANDOFF.md` (this file).
```
