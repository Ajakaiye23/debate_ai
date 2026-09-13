# Debate Me

An audio-first debate app. You speak your argument, **Claude** fact-checks and scores it
in real time, your phone reads the verdict back aloud, and the app tracks which debating
skill you are weakest at and drills you on it. Topics are typed in by the players —
there are no presets.

Built with Expo (SDK 54) + Expo Router + React Native + TypeScript.
*(The repo and bundle id are still `debate_ai` / `com.ajakaiye.debateai`; the app's
display name is "Debate Me".)*

## Modes

- **Pass & Play** — two players on one phone, taking turns.
- **Solo vs AI** — debate "Rival", an AI opponent (easy / medium / hard).
- **Formal Debate** — opening → a real cross-examination (question → answer, both ways)
  → closing. 1v1 or 2v2 with team names, and optional silent prep time.
- **Online Multiplayer** — 6-character party code, turn-synced across phones, with an
  ELO leaderboard. Code is complete; it needs Firebase keys (below) to run.

## How a turn works

```
Turn starts → you speak
→ transcribed on-device (expo-speech-recognition) — or by OpenAI Whisper in Expo Go,
  or skip speech entirely with "Type instead"
→ Claude scores accuracy / strength / clarity / rebuttal, names any logical fallacies,
  and fact-checks the claims
→ the device voice reads the summary aloud (free, offline, no TTS key)
→ next turn. After the final segment Claude delivers a verdict plus per-player coaching.
```

Afterwards, the results screen offers **"Practice your <weakest skill>"** — a single
AI-generated drill graded on that skill alone — and **Progress** charts your skill
averages and trend over every debate you've saved.

## Setup

Copy `.env.example` → `.env` and fill in what you need. Only the first key is required.

| Variable | Required? | Where |
|---|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | **yes** (unless using the proxy) | console.anthropic.com → API Keys |
| `EXPO_PUBLIC_OPENAI_API_KEY` | optional | platform.openai.com — Whisper, only used as the Expo Go speech fallback |
| `EXPO_PUBLIC_PROXY_URL` | before sharing the app | URL of the deployed `server/` proxy |
| `EXPO_PUBLIC_APP_KEY` | with the proxy | the same shared secret you set as `APP_KEY` on the proxy |
| `EXPO_PUBLIC_FIREBASE_API_KEY` / `_PROJECT_ID` / `_DATABASE_URL` | multiplayer only | console.firebase.google.com → Realtime Database |

> `EXPO_PUBLIC_*` values are bundled into the client build and can be extracted from it.
> That's fine while you're the only user; deploy `server/` and switch to the proxy before
> anyone else installs the app. See `server/README.md` and `SECURITY.md`.

Players can also paste **their own** Anthropic key on the Settings screen. When they do,
the app calls Anthropic directly on their account (even if a proxy is configured) and
their debates are uncapped. Without one, free use is capped at 10 debates/day
(`src/store/usage.ts`) so the owner's key can't be drained.

## Run

```bash
npm install
npx expo start --tunnel   # --tunnel only if LAN/VPN blocks the QR connection
```

Scan the QR code with **Expo Go** (iOS Camera app, or Expo Go on Android).

> **Expo SDK 54 is pinned on purpose** — it's what the owner's Expo Go build supports.
> Upgrading the Expo packages breaks phone testing. See `OWNER_GUIDE.md`.

> **Real device required.** Microphone recording, speech recognition, and speech playback
> don't work reliably in a simulator. On-device speech-to-text also needs a dev/EAS build;
> inside Expo Go the app automatically falls back to record → Whisper, and "Type instead"
> works everywhere.

Before committing, the three checks this project uses:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform android
```

## Project layout

```
src/
├── app/            Expo Router screens — index, setup, debate, results, history,
│                   settings, progress, practice, multiplayer, mp-debate, leaderboard
├── components/     Primitives (Screen/Button/Chip), DuskBackground, MicButton, TimerBar,
│                   ArgumentCard, ScoreBreakdown, ScorePill, VerdictBanner,
│                   StartupScreen, ErrorBoundary
├── services/       claude, whisper, stt (on-device), tts (device voice), sounds,
│                   progress, elo, firebase, proxy
├── hooks/          useDebateState (the segment engine), useAudioRecorder, useTimer
├── store/          settings, usage (daily cap), identity, debateHistory, activeDebate
├── constants/      theme (Neon Dusk), prompts, format (buildSegments)
├── types/          debate types
└── utils/          json (safe parsing of model output), haptics

server/             zero-dependency Node proxy that holds the secret keys
store/              app icon generator, privacy policy, store listing copy
```

## Docs

| File | What it's for |
|---|---|
| `OWNER_GUIDE.md` | Step-by-step, click-by-click task list for the owner (run it, Firebase, deploy, demo video) |
| `CODE_TOUR.md` | How a debate flows through the code, and the design decisions worth explaining |
| `SECURITY.md` | What's protected, what isn't, and why |
| `HANDOFF.md` | Full session history + what is built vs. runtime-tested |
| `SKILL.md` | The original build playbook this app was generated from |

## Notes / deviations from the original skill

- Uses **`expo-audio`** (recording + playback) — `expo-av` was removed in SDK 54+.
- **Text-to-speech is the device's own voice** (`expo-speech`). ElevenLabs was removed:
  it was the most expensive part of a debate, and the on-device voice is free and offline.
- Styled with **React Native StyleSheet + theme tokens** instead of NativeWind, for
  compatibility with the SDK 54 / React Compiler stack.
- Claude and Whisper are called via plain `fetch` rather than their Node SDKs (more
  reliable in the React Native runtime).
- Everything runs on **`claude-haiku-4-5-20251001`** — judging, verdicts, the AI opponent
  and the practice drills — which keeps a debate to a few cents.
- **Mobile only.** Web support was deliberately removed; don't re-add a `web` target.
