# DebateAI

An audio-based debate app. Two players speak their arguments, **Claude** fact-checks
and scores each one in real time, and **ElevenLabs** reads the verdict aloud. Players
type in any topic they want — there are no presets.

Built with Expo (SDK 56) + Expo Router + React Native.

## Modes

- **Pass & Play** — two players on one phone, taking turns.
- **Solo vs AI** — debate against Claude (easy / medium / hard).
- **Online Multiplayer** — *coming soon* (Firebase service is scaffolded in `src/services/firebase.ts`).

## How a turn works

```
Hold the mic → record argument → release (or timer runs out)
→ OpenAI Whisper transcribes it
→ Claude scores accuracy / strength / clarity + fact-checks
→ ElevenLabs reads the spoken summary aloud
→ next turn. After the final round, Claude delivers a verdict.
```

## Setup

You need three API keys. Enter them **either** in `.env` (copy `.env.example` → `.env`)
**or** at runtime on the in-app **Settings** screen (stored on-device, overrides `.env`).

| Key | Where |
|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `EXPO_PUBLIC_OPENAI_API_KEY` | platform.openai.com → API Keys (Whisper) |
| `EXPO_PUBLIC_ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Key |
| `EXPO_PUBLIC_ELEVENLABS_VOICE_ID` | elevenlabs.io/voice-lab (any voice) |

> `EXPO_PUBLIC_*` keys are bundled into the client build. Fine for a prototype —
> proxy them server-side before shipping to production.

## Run

```bash
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android), or scan the QR code with **Expo Go**.

> **Real device recommended.** Microphone recording, Whisper, and ElevenLabs
> playback don't work reliably in a simulator.

## Project layout

```
src/
├── app/            # Expo Router screens (index, setup, debate, results, history, settings)
├── components/     # MicButton, TimerBar, ArgumentCard, VerdictBanner, ScoreBreakdown, …
├── services/       # whisper, claude, elevenlabs, firebase
├── hooks/          # useDebateState (state machine), useAudioRecorder, useTimer
├── store/          # settings, debateHistory, activeDebate (AsyncStorage + in-memory)
├── constants/      # theme (Neon Dusk), prompts
├── types/          # debate types
└── utils/          # safe JSON parsing for model output
```

`SKILL.md` is the original build playbook this app was generated from.

## Notes / deviations from the original skill

- Uses **`expo-audio`** (recording + playback) — `expo-av` was removed in SDK 54+.
- Styled with **React Native StyleSheet + theme tokens** instead of NativeWind, for
  compatibility with the bleeding-edge SDK 56 / React Compiler stack.
- Claude/OpenAI are called via plain `fetch` rather than their Node SDKs (more reliable
  in the RN runtime).
