---
name: debateai
description: Full build skill for DebateAI — an audio-based mobile debate app built with Expo React Native. Two players debate a custom topic they type in, Claude acts as AI judge and real-time fact-checker, and ElevenLabs reads verdicts aloud. Use this skill whenever building, extending, or debugging the DebateAI app. Covers all three modes (Pass & Play, Solo vs AI, Online Multiplayer), API integrations, folder structure, and deployment.
---

# DebateAI — Claude Code Build Skill

An audio-based debate app where two players speak their arguments, Claude fact-checks and scores each one in real time, and ElevenLabs reads the verdict aloud. Players type in any debate topic they want — there is no preset list.

---

## First-Time Setup: API Keys

Before writing any code, prompt the user for the following keys and save them to `.env`:

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=        # console.anthropic.com
EXPO_PUBLIC_OPENAI_API_KEY=           # platform.openai.com (for Whisper STT)
EXPO_PUBLIC_ELEVENLABS_API_KEY=       # elevenlabs.io
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=      # from elevenlabs.io/voice-lab
EXPO_PUBLIC_FIREBASE_API_KEY=         # firebase.google.com (multiplayer only)
EXPO_PUBLIC_FIREBASE_PROJECT_ID=      # firebase.google.com (multiplayer only)
EXPO_PUBLIC_FIREBASE_DATABASE_URL=    # firebase.google.com (multiplayer only)
```

Tell the user:
- **Anthropic** → console.anthropic.com → API Keys
- **OpenAI (Whisper)** → platform.openai.com → API Keys
- **ElevenLabs** → elevenlabs.io → Profile → API Key. Voice ID from elevenlabs.io/voice-lab (pick any voice for the judge)
- **Firebase** → firebase.google.com → Create project → Realtime Database → Project Settings (only needed for Online Multiplayer mode)

Add `.env` to `.gitignore` immediately.

> **Security note:** `EXPO_PUBLIC_*` keys are bundled into the client app and are visible to anyone who inspects the build. This is fine for a hackathon/prototype, but **before shipping to production** move all model calls behind a small proxy (e.g. an Expo API route, Cloudflare Worker, or Firebase Function) and keep the secret keys server-side. The service files below are written so that swapping `baseURL` to a proxy is a one-line change.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Expo + React Native (Expo Router) |
| Styling | NativeWind v5 (Tailwind for RN) |
| Speech-to-Text | OpenAI Whisper API (`expo-av` records, Whisper transcribes) |
| AI Judge | Anthropic API (`claude-sonnet-4-20250514`) |
| Text-to-Speech | ElevenLabs API |
| Multiplayer Sync | Firebase Realtime Database |
| Haptics | expo-haptics |
| Storage | AsyncStorage (debate history, settings) |
| Animations | Reanimated 3 |

---

## Project Initialization

```bash
npx create-expo-app@latest DebateAI --template tabs
cd DebateAI

npx expo install expo-av expo-haptics expo-router expo-file-system
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-reanimated
npm install nativewind tailwindcss
npm install @anthropic-ai/sdk
npm install openai
npm install firebase
```

> Note: there is **no** `elevenlabs` npm package needed — TTS is a plain `fetch` (see `services/elevenlabs.ts`). Adding the SDK only bloats the bundle.

After install, enable the Reanimated Babel plugin in `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // must be LAST
  };
};
```

---

## Folder Structure

```
DebateAI/
├── app/
│   ├── _layout.tsx              # Root layout (Stack navigator)
│   ├── index.tsx                # Home screen — mode selection
│   ├── setup.tsx                # Topic input + player sides + settings
│   ├── debate.tsx               # Core debate screen (all modes)
│   ├── results.tsx              # Scorecard + verdict screen
│   ├── history.tsx              # Past debates list
│   └── settings.tsx             # API keys, voice, volume, preferences
├── components/
│   ├── MicButton.tsx            # Hold-to-record mic button
│   ├── TimerBar.tsx             # Countdown timer bar
│   ├── ArgumentCard.tsx         # Displays transcribed argument + score
│   ├── VerdictBanner.tsx        # Animated winner announcement
│   └── ScoreBreakdown.tsx       # Per-round score table
├── services/
│   ├── whisper.ts               # Audio → text via OpenAI Whisper
│   ├── claude.ts                # Fact-check, judge, AI debater calls
│   ├── elevenlabs.ts            # Text → speech playback
│   └── firebase.ts              # Realtime DB sync (multiplayer)
├── hooks/
│   ├── useDebateState.ts        # Core debate state machine
│   ├── useAudioRecorder.ts      # expo-av recording logic
│   └── useTimer.ts              # Countdown timer hook
├── store/
│   └── debateHistory.ts         # AsyncStorage read/write for history
├── types/
│   └── debate.ts                # TypeScript types for all debate data
├── constants/
│   ├── prompts.ts               # All Claude system/user prompts
│   └── theme.ts                 # Colors, fonts, spacing tokens
├── utils/
│   └── json.ts                  # Safe JSON parsing for model output
└── .env                         # API keys (never commit this)
```

---

## Core Data Types (`types/debate.ts`)

```typescript
export type DebateMode = 'pass-and-play' | 'solo-vs-ai' | 'multiplayer';
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: 'player1' | 'player2' | 'ai';
  name: string;
  side: 'for' | 'against';
}

export interface Scores {
  accuracy: number;      // 1–10
  strength: number;      // 1–10
  clarity: number;       // 1–10
}

export interface Argument {
  playerId: string;
  transcript: string;
  round: number;
  scores: Scores;
  factCheckNotes: string;
  spokenSummary: string;
  winner: boolean;
}

export interface DebateSession {
  id: string;
  topic: string;             // User typed — never preset
  mode: DebateMode;
  players: [Player, Player];
  rounds: number;            // Customizable, default 3
  turnDuration: number;      // Seconds per turn, customizable
  arguments: Argument[];
  verdict: string;
  winner: Player | 'tie';
  createdAt: number;
}
```

---

## App Screens

### 1. Home Screen (`app/index.tsx`)
- App title + tagline
- Three mode cards: **Pass & Play**, **Solo vs AI**, **Online Multiplayer**
- Button to view debate history
- Gear icon → settings

### 2. Setup Screen (`app/setup.tsx`)
- **Topic input** — freeform text field. Label: "What do you want to debate?" No suggestions, no presets.
- Player 1 name + side (For / Against)
- Player 2 name (or "AI" if solo mode) + opposite side auto-assigned
- Settings before starting:
  - Number of rounds (1–10, default 3)
  - Turn duration (15s / 30s / 60s / 90s)
  - AI Difficulty (Solo mode only): Easy / Medium / Hard
- "Start Debate" button — passes config to `debate.tsx` via Expo Router params

### 3. Debate Screen (`app/debate.tsx`)
Core screen — handles all three modes.

**UI elements:**
- Topic shown at top
- Current speaker name + round indicator (e.g. "Round 2 of 3 — Player 1's Turn")
- `<TimerBar />` — animates countdown, turns red at 10 seconds
- `<MicButton />` — large center button, hold to record, release to submit
- Transcription preview — shows live text as Whisper returns it
- `<ArgumentCard />` — after each turn, shows transcript + scores + fact-check notes
- ElevenLabs reads fact-check verdict aloud automatically after each turn
- "Next Turn" button appears after verdict is read

**Turn flow:**
```
Player holds MicButton
→ expo-av starts recording
→ Player releases MicButton (or timer runs out)
→ expo-av stops, returns audio file
→ whisper.ts sends audio to Whisper API → transcript string
→ claude.ts sends transcript + full debate history to Claude
→ Claude returns: { accuracy, strength, clarity, factCheckNotes, spokenSummary, roundWinner }
→ scores displayed in ArgumentCard
→ elevenlabs.ts speaks the spokenSummary aloud
→ Next player's turn begins
```

In **Solo vs AI** mode, after the human turn the AI debater takes its turn automatically: `getAIArgument(...)` produces text, it is scored by `factCheckArgument(...)`, then spoken aloud. The mic stays disabled during the AI turn.

### 4. Results Screen (`app/results.tsx`)
- Animated winner announcement (`<VerdictBanner />`)
- `<ScoreBreakdown />` — table of all rounds, scores per player
- Claude's full written verdict (why this player won)
- ElevenLabs reads the full `spokenVerdict` aloud on screen load
- Buttons: Share scorecard | View full transcript | Rematch | Home
- Debate saved to history automatically (call `saveDebate()` once on mount)

### 5. History Screen (`app/history.tsx`)
- List of past debates from AsyncStorage (`loadDebates()`)
- Shows: topic, winner, date, mode
- Tap to view full results

### 6. Settings Screen (`app/settings.tsx`)
- API key fields (Anthropic, OpenAI, ElevenLabs) with show/hide toggle
- ElevenLabs voice selector (fetches available voices via `fetchVoices()`)
- Judge volume slider
- Default turn duration
- Default rounds
- Clear history button (`clearDebates()`)

---

## Claude Prompts (`constants/prompts.ts`)

### Fact-Check Prompt (after each argument)
```typescript
import type { Argument, AIDifficulty } from '../types/debate';

export const FACT_CHECK_PROMPT = (
  topic: string,
  side: string,
  transcript: string,
  history: string
) => `
You are an impartial AI debate judge. A debate is happening on the topic: "${topic}".

Full debate so far:
${history || '(this is the first argument)'}

The current speaker is arguing "${side}" and just said:
"${transcript}"

Evaluate this argument and respond ONLY with valid JSON (no markdown, no code fences):
{
  "accuracy": <1-10>,
  "strength": <1-10>,
  "clarity": <1-10>,
  "factCheckNotes": "<1-2 sentences: flag any factual errors or confirm accuracy>",
  "spokenSummary": "<2-3 sentences max, conversational, to be read aloud by TTS — give the scores and a brief note on the argument>",
  "roundWinner": <true if this player won this exchange, false if not>
}
`;
```

### Final Verdict Prompt (end of all rounds)
```typescript
export const VERDICT_PROMPT = (
  topic: string,
  allArguments: Argument[]
) => `
You are an impartial AI debate judge. The debate topic was: "${topic}".

Here is the full debate transcript with scores:
${JSON.stringify(allArguments, null, 2)}

Give a final verdict. Respond ONLY with valid JSON (no markdown, no code fences):
{
  "winner": "<player name or 'tie'>",
  "reason": "<2-3 sentences explaining why this player won overall>",
  "spokenVerdict": "<A dramatic 3-4 sentence spoken verdict to be read aloud — announce the winner, give the key reason, compliment both debaters>"
}
`;
```

### Solo vs AI — Claude's Argument Prompt
```typescript
export const AI_DEBATER_PROMPT = (
  topic: string,
  side: string,
  history: string,
  difficulty: AIDifficulty
) => `
You are debating "${side}" on the topic: "${topic}".

Difficulty: ${difficulty}
- easy: make a reasonable but slightly weak argument, avoid aggressive tactics
- medium: make a solid evidence-based argument
- hard: make a sharp, aggressive argument, actively dismantle previous points

Full debate so far:
${history || '(you are opening the debate)'}

Respond with ONLY your spoken argument in plain text. 30-60 seconds when read aloud.
No JSON. No labels. Just the argument as if you are speaking.
`;
```

---

## Utility: Safe JSON Parsing (`utils/json.ts`)

Models occasionally wrap JSON in ```` ```json ```` fences or add a stray sentence. **Never** call `JSON.parse` on raw model output. Use this everywhere a model is asked for JSON:

```typescript
/**
 * Extracts and parses the first JSON object/array from a model response.
 * Strips markdown code fences and surrounding prose. Throws on failure.
 */
export function safeJsonParse<T = any>(raw: string): T {
  let text = raw.trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Fall back to the first {...} or [...] block
  if (!text.startsWith('{') && !text.startsWith('[')) {
    const obj = text.match(/[{[][\s\S]*[}\]]/);
    if (obj) text = obj[0];
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Failed to parse model JSON. Raw output:\n${raw}`);
  }
}
```

---

## Service Implementations

### `services/whisper.ts`

`expo-av` writes the recording to a local file URI; the OpenAI SDK accepts an RN file descriptor directly. Do **not** read the file into base64 first — that's unused work and large arguments crash on device.

```typescript
import OpenAI from 'openai';
import { Platform } from 'react-native';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  // RN has no `process` event loop guard the SDK expects; allow browser-like usage:
  dangerouslyAllowBrowser: true,
});

export async function transcribeAudio(audioUri: string): Promise<string> {
  // expo-av records .m4a on iOS and .m4a/.mp4 on Android. Whisper accepts both;
  // the MIME type just has to match the container.
  const name = audioUri.split('/').pop() ?? 'audio.m4a';
  const type = name.endsWith('.mp4') ? 'audio/mp4' : 'audio/m4a';

  const response = await openai.audio.transcriptions.create({
    file: { uri: audioUri, name, type } as any,
    model: 'whisper-1',
    language: 'en',
  });

  return response.text.trim();
}
```

### `services/claude.ts`

Every JSON-returning call goes through `safeJsonParse`, wrapped in try/catch by the caller (the debate state machine surfaces a retry toast on failure).

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { FACT_CHECK_PROMPT, VERDICT_PROMPT, AI_DEBATER_PROMPT } from '../constants/prompts';
import { safeJsonParse } from '../utils/json';
import type { Argument, AIDifficulty } from '../types/debate';

const MODEL = 'claude-sonnet-4-20250514';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

function textOf(response: Anthropic.Message): string {
  const block = response.content[0];
  return block && block.type === 'text' ? block.text : '';
}

export interface FactCheckResult {
  accuracy: number;
  strength: number;
  clarity: number;
  factCheckNotes: string;
  spokenSummary: string;
  roundWinner: boolean;
}

export async function factCheckArgument(
  topic: string, side: string, transcript: string, history: string
): Promise<FactCheckResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: FACT_CHECK_PROMPT(topic, side, transcript, history) }],
  });
  return safeJsonParse<FactCheckResult>(textOf(response));
}

export interface VerdictResult {
  winner: string;
  reason: string;
  spokenVerdict: string;
}

export async function getFinalVerdict(
  topic: string, allArguments: Argument[]
): Promise<VerdictResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: VERDICT_PROMPT(topic, allArguments) }],
  });
  return safeJsonParse<VerdictResult>(textOf(response));
}

export async function getAIArgument(
  topic: string, side: string, history: string, difficulty: AIDifficulty
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: AI_DEBATER_PROMPT(topic, side, history, difficulty) }],
  });
  return textOf(response).trim();
}
```

### `services/elevenlabs.ts`

**Do not use `URL.createObjectURL`** — it does not exist in React Native and is the most common cause of "verdict never plays" bugs. Stream the MP3 to `FileSystem.cacheDirectory` and play the file URI with `expo-av`. This works identically on iOS and Android.

```typescript
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Synthesizes `text` with ElevenLabs and plays it. Resolves when playback finishes.
 * Safe to call back-to-back — each call cleans up its own sound + temp file.
 */
export async function speakText(text: string, volume: number = 1.0): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  const voiceId = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    console.warn('ElevenLabs not configured — skipping TTS');
    return;
  }

  // Respect the silent switch / route to speaker, and allow playback in silent mode.
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const response = await fetch(`${ELEVEN_BASE}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs error ${response.status}: ${await response.text()}`);
  }

  // Read the binary response as base64 and write it to a temp file.
  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const fileUri = `${FileSystem.cacheDirectory}tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri: fileUri },
    { volume, shouldPlay: true }
  );

  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) resolve();
    });
  });

  await sound.unloadAsync();
  // Best-effort cleanup of the temp file.
  FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // global.btoa exists in Expo's Hermes runtime; falls back to Buffer if not.
  return typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
}

/** Fetches the user's available ElevenLabs voices for the settings picker. */
export async function fetchVoices(): Promise<{ voice_id: string; name: string }[]> {
  const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) return [];
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.voices ?? []).map((v: any) => ({ voice_id: v.voice_id, name: v.name }));
}
```

---

## Hooks

### `hooks/useTimer.ts`

Drives a countdown shared value for the `TimerBar` and fires `onExpire` when it hits zero.

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export function useTimer(durationSeconds: number, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warned = useRef(false);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const start = useCallback(() => {
    setTimeLeft(durationSeconds);
    warned.current = false;
    setRunning(true);
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        if (next === 10 && !warned.current) {
          warned.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        if (next <= 0) {
          stop();
          onExpire();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onExpire, stop]);

  return { timeLeft, running, start, stop };
}
```

### `hooks/useAudioRecorder.ts`

Wraps `expo-av` recording. Requests mic permission lazily, returns the file URI on stop.

```typescript
import { useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export function useAudioRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission denied');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  /** Stops recording and returns the audio file URI (or null if nothing recorded). */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    recordingRef.current = null;
    return uri ?? null;
  }, []);

  return { isRecording, startRecording, stopRecording };
}
```

### `hooks/useDebateState.ts`

The core state machine. Tracks whose turn it is, the round, accumulated arguments, and the current phase. Screens read `phase` to decide what to render.

```typescript
import { useState, useCallback, useMemo } from 'react';
import type {
  DebateSession, Player, Argument, DebateMode, AIDifficulty,
} from '../types/debate';
import { factCheckArgument, getAIArgument, getFinalVerdict } from '../services/claude';
import { transcribeAudio } from '../services/whisper';

type Phase =
  | 'idle'         // waiting for current speaker to record
  | 'transcribing' // Whisper running
  | 'judging'      // Claude scoring
  | 'speaking'     // TTS reading summary (caller drives the actual playback)
  | 'ai-thinking'  // Claude generating the AI's argument (solo mode)
  | 'complete';    // all rounds done, verdict ready

export interface DebateConfig {
  topic: string;
  mode: DebateMode;
  players: [Player, Player];
  rounds: number;
  turnDuration: number;
  difficulty?: AIDifficulty;
}

export function useDebateState(config: DebateConfig) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(1);
  const [turnIndex, setTurnIndex] = useState(0); // 0 → players[0], 1 → players[1]
  const [args, setArgs] = useState<Argument[]>([]);
  const [verdict, setVerdict] = useState<Awaited<ReturnType<typeof getFinalVerdict>> | null>(null);
  const [lastSpoken, setLastSpoken] = useState<string>('');

  const currentPlayer = config.players[turnIndex];

  const historyText = useMemo(
    () =>
      args
        .map((a) => `[Round ${a.round}] ${a.playerId} (${sideOf(config, a.playerId)}): ${a.transcript}`)
        .join('\n'),
    [args, config]
  );

  /** Advances turn/round counters. Returns true if the debate is now over. */
  const advance = useCallback(() => {
    const isLastPlayer = turnIndex === config.players.length - 1;
    if (isLastPlayer) {
      if (round >= config.rounds) return true; // debate over
      setRound((r) => r + 1);
      setTurnIndex(0);
    } else {
      setTurnIndex((i) => i + 1);
    }
    return false;
  }, [turnIndex, round, config.rounds, config.players.length]);

  /** Scores a transcript, appends the Argument, returns the spokenSummary for TTS. */
  const scoreTranscript = useCallback(
    async (player: Player, transcript: string): Promise<string> => {
      setPhase('judging');
      const result = await factCheckArgument(config.topic, player.side, transcript, historyText);
      const arg: Argument = {
        playerId: player.id,
        transcript,
        round,
        scores: { accuracy: result.accuracy, strength: result.strength, clarity: result.clarity },
        factCheckNotes: result.factCheckNotes,
        spokenSummary: result.spokenSummary,
        winner: result.roundWinner,
      };
      setArgs((prev) => [...prev, arg]);
      setLastSpoken(result.spokenSummary);
      setPhase('speaking');
      return result.spokenSummary;
    },
    [config.topic, historyText, round]
  );

  /** Human turn: audioUri → transcript → score. Returns text to speak. */
  const submitHumanTurn = useCallback(
    async (audioUri: string): Promise<string> => {
      setPhase('transcribing');
      const transcript = await transcribeAudio(audioUri);
      return scoreTranscript(currentPlayer, transcript);
    },
    [currentPlayer, scoreTranscript]
  );

  /** AI turn (solo mode): generate argument → score. Returns text to speak. */
  const submitAITurn = useCallback(async (): Promise<string> => {
    setPhase('ai-thinking');
    const text = await getAIArgument(
      config.topic, currentPlayer.side, historyText, config.difficulty ?? 'medium'
    );
    return scoreTranscript(currentPlayer, text);
  }, [config.topic, config.difficulty, currentPlayer, historyText, scoreTranscript]);

  /** Call after the spokenSummary has finished playing. */
  const finishTurn = useCallback(async () => {
    const over = advance();
    if (over) {
      setPhase('judging');
      const v = await getFinalVerdict(config.topic, args);
      setVerdict(v);
      setPhase('complete');
    } else {
      setPhase('idle');
    }
  }, [advance, config.topic, args]);

  const buildSession = useCallback((): DebateSession => {
    const winnerPlayer =
      verdict?.winner && verdict.winner !== 'tie'
        ? config.players.find((p) => p.name === verdict.winner) ?? 'tie'
        : 'tie';
    return {
      id: `debate-${Date.now()}`,
      topic: config.topic,
      mode: config.mode,
      players: config.players,
      rounds: config.rounds,
      turnDuration: config.turnDuration,
      arguments: args,
      verdict: verdict?.reason ?? '',
      winner: winnerPlayer,
      createdAt: Date.now(),
    };
  }, [verdict, config, args]);

  return {
    phase, round, currentPlayer, turnIndex, args, verdict, lastSpoken,
    submitHumanTurn, submitAITurn, finishTurn, buildSession,
  };
}

function sideOf(config: DebateConfig, playerId: string): string {
  return config.players.find((p) => p.id === playerId)?.side ?? '';
}
```

---

## Store: Debate History (`store/debateHistory.ts`)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DebateSession } from '../types/debate';

const KEY = 'debateai:history';

export async function loadDebates(): Promise<DebateSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DebateSession[]) : [];
  } catch {
    return [];
  }
}

export async function saveDebate(session: DebateSession): Promise<void> {
  const all = await loadDebates();
  // Newest first; de-dupe by id so a re-render doesn't double-save.
  const next = [session, ...all.filter((d) => d.id !== session.id)];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearDebates(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
```

---

## Online Multiplayer (Firebase)

Firebase Realtime Database schema:
```json
{
  "debates": {
    "<roomCode>": {
      "topic": "string",
      "players": { "player1": {}, "player2": {} },
      "status": "waiting | active | complete",
      "currentTurn": "player1 | player2",
      "arguments": [],
      "verdict": null
    }
  }
}
```

Room code: 6-character alphanumeric, generated on room creation, shared with opponent to join.

### `services/firebase.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase, ref, set, update, onValue, push, get, off,
} from 'firebase/database';
import type { Argument, Player } from '../types/debate';

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      });

const db = getDatabase(app);

export interface Room {
  topic: string;
  players: { player1?: Player; player2?: Player };
  status: 'waiting' | 'active' | 'complete';
  currentTurn: 'player1' | 'player2';
  arguments: Argument[];
  verdict: string | null;
}

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createRoom(topic: string, host: Player): Promise<string> {
  const code = makeRoomCode();
  const room: Room = {
    topic,
    players: { player1: host },
    status: 'waiting',
    currentTurn: 'player1',
    arguments: [],
    verdict: null,
  };
  await set(ref(db, `debates/${code}`), room);
  return code;
}

export async function joinRoom(code: string, guest: Player): Promise<boolean> {
  const snap = await get(ref(db, `debates/${code}`));
  if (!snap.exists()) return false;
  await update(ref(db, `debates/${code}`), {
    'players/player2': guest,
    status: 'active',
  });
  return true;
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): () => void {
  const r = ref(db, `debates/${code}`);
  onValue(r, (snap) => cb(snap.exists() ? (snap.val() as Room) : null));
  return () => off(r);
}

export async function pushArgument(code: string, arg: Argument): Promise<void> {
  await push(ref(db, `debates/${code}/arguments`), arg);
}

export async function setTurn(code: string, turn: 'player1' | 'player2'): Promise<void> {
  await update(ref(db, `debates/${code}`), { currentTurn: turn });
}

export async function setVerdict(code: string, verdict: string): Promise<void> {
  await update(ref(db, `debates/${code}`), { verdict, status: 'complete' });
}
```

Build multiplayer last — get Pass & Play and Solo vs AI working first.

---

## Build Order

1. **Project setup** — init Expo, install deps, configure `.env`, Babel + Tailwind config
2. **Types + constants** — `types/debate.ts`, `constants/prompts.ts`, `constants/theme.ts`, `utils/json.ts`
3. **Services** — `whisper.ts`, `claude.ts`, `elevenlabs.ts`
4. **Hooks + store** — `useTimer.ts`, `useAudioRecorder.ts`, `useDebateState.ts`, `debateHistory.ts`
5. **Pass & Play mode** — Setup screen → Debate screen → Results screen
6. **History + Settings** — AsyncStorage, API key inputs, voice selector
7. **Solo vs AI mode** — wire `submitAITurn` into the debate screen
8. **Online Multiplayer** — Firebase setup, room codes, real-time sync
9. **Polish** — Haptics, animations, share scorecard, rematch flow
10. **EAS Build** — `eas build --platform all`
11. **Submit** — `eas submit --platform ios` + `eas submit --platform android`

---

## Components

Full implementations of the five components. They consume `constants/theme.ts` and the style snippets are baked in.

### `components/TimerBar.tsx`
```tsx
import Animated, {
  useAnimatedStyle, useDerivedValue, interpolateColor, withTiming,
} from 'react-native-reanimated';
import { View } from 'react-native';
import { colors } from '../constants/theme';

export function TimerBar({ timeLeft, duration }: { timeLeft: number; duration: number }) {
  const pct = useDerivedValue(() => withTiming(Math.max(0, timeLeft / duration)));
  const style = useAnimatedStyle(() => ({
    width: `${pct.value * 100}%`,
    backgroundColor: interpolateColor(timeLeft, [0, 10, 11], [colors.coral, colors.coral, colors.sky]),
  }));
  return (
    <View className="w-full h-1 bg-elevated rounded-full overflow-hidden">
      <Animated.View style={[{ height: '100%', borderRadius: 999 }, style]} />
    </View>
  );
}
```

### `components/MicButton.tsx`
```tsx
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MicButton({
  isRecording, onPressIn, onPressOut, disabled,
}: {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = isRecording
      ? withRepeat(withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true)
      : withTiming(1);
  }, [isRecording]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[
        style,
        {
          width: 96, height: 96, borderRadius: 48,
          backgroundColor: disabled ? colors.text.disabled : isRecording ? '#CC44B0' : colors.pink,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: isRecording ? 3 : 0, borderColor: 'rgba(255, 94, 224, 0.3)',
        },
      ]}
    >
      <Ionicons name="mic" size={40} color={colors.bg.void} />
    </AnimatedPressable>
  );
}
```

### `components/ScoreBreakdown.tsx`
```tsx
import { View, Text } from 'react-native';
import type { Argument } from '../types/debate';

function ScorePill({ label, score }: { label: string; score: number }) {
  return (
    <View className="flex-1 bg-elevated rounded-lg py-1.5 items-center">
      <Text className="text-sky text-xs font-bold">{label}</Text>
      <Text className="text-primary text-sm font-bold">{score}/10</Text>
    </View>
  );
}

export function ScoreBreakdown({ args }: { args: Argument[] }) {
  return (
    <View className="gap-3">
      {args.map((a, i) => (
        <View key={i} className="bg-surface border border-sky/20 rounded-2xl p-4">
          <Text className="text-secondary text-xs mb-2 uppercase tracking-widest">
            {a.playerId} · Round {a.round}
          </Text>
          <View className="flex-row gap-2">
            <ScorePill label="Accuracy" score={a.scores.accuracy} />
            <ScorePill label="Strength" score={a.scores.strength} />
            <ScorePill label="Clarity" score={a.scores.clarity} />
          </View>
        </View>
      ))}
    </View>
  );
}
```

### `components/ArgumentCard.tsx`
```tsx
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import type { Argument } from '../types/debate';

function ScorePill({ label, score }: { label: string; score: number }) {
  return (
    <View className="flex-1 bg-elevated rounded-lg py-1.5 items-center">
      <Text className="text-sky text-xs font-bold">{label}</Text>
      <Text className="text-primary text-sm font-bold">{score}/10</Text>
    </View>
  );
}

export function ArgumentCard({ arg, playerName }: { arg: Argument; playerName: string }) {
  const slide = useSharedValue(60);
  const opacity = useSharedValue(0);
  useEffect(() => {
    slide.value = withSpring(0, { damping: 18, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }], opacity: opacity.value }));

  return (
    <Animated.View style={style} className="bg-surface border border-sky/20 rounded-2xl p-4 mt-3">
      <Text className="text-secondary text-xs mb-1 uppercase tracking-widest">
        {playerName} · Round {arg.round}
      </Text>
      <Text className="text-primary text-sm leading-relaxed">{arg.transcript}</Text>
      <View className="flex-row gap-2 mt-3">
        <ScorePill label="Accuracy" score={arg.scores.accuracy} />
        <ScorePill label="Strength" score={arg.scores.strength} />
        <ScorePill label="Clarity" score={arg.scores.clarity} />
      </View>
      <Text className="text-secondary text-xs mt-3 leading-relaxed italic">{arg.factCheckNotes}</Text>
    </Animated.View>
  );
}
```

### `components/VerdictBanner.tsx`
```tsx
import { View, Text } from 'react-native';
import { fonts, colors } from '../constants/theme';

export function VerdictBanner({ winnerName, isTie }: { winnerName: string; isTie?: boolean }) {
  return (
    <View className="items-center py-8">
      <Text className="text-gold text-xs font-bold tracking-widest uppercase mb-2">
        {isTie ? 'Result' : 'Winner'}
      </Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.pink }}>
        {isTie ? "It's a tie" : winnerName}
      </Text>
      {!isTie && (
        <View className="bg-win/10 border border-win/30 rounded-full px-4 py-1 mt-3">
          <Text className="text-win text-sm font-semibold">Victory</Text>
        </View>
      )}
    </View>
  );
}
```

---

## Game Feel & Polish

- Haptic on mic button press/release (`expo-haptics`) — built into `useAudioRecorder`
- Timer bar animates red + haptic pulse at 10 seconds — built into `useTimer` + `TimerBar`
- ArgumentCard slides in with Reanimated spring after each turn — built into `ArgumentCard`
- VerdictBanner uses confetti animation on winner announcement (`react-native-confetti-cannon`)
- Score numbers count up (0 → final value) over 1 second
- Mute ElevenLabs if phone is on silent (respect audio session) — `Audio.setAudioModeAsync` in `elevenlabs.ts`

---

## Common Pitfalls

- **Whisper audio format**: expo-av records `.m4a` on iOS, `.m4a`/`.mp4` on Android — Whisper accepts both, but always pass the correct MIME type (handled in `whisper.ts` by inspecting the URI extension). Do **not** read the file into base64 first.
- **Claude JSON parsing**: never call `JSON.parse()` directly — always go through `safeJsonParse` (strips fences, extracts the first JSON block) and wrap the call site in try/catch.
- **ElevenLabs on React Native**: `URL.createObjectURL` does **not** exist — write the MP3 to `FileSystem.cacheDirectory` and load from the file URI (handled in `elevenlabs.ts`).
- **SDKs in the client**: the Anthropic and OpenAI SDKs need `dangerouslyAllowBrowser: true` to run in the RN/Hermes runtime. Acceptable for a prototype; proxy before production.
- **Firebase rules**: Set Realtime Database rules to authenticated-only before shipping (defaults are test-mode open).
- **API keys in Expo**: `EXPO_PUBLIC_` prefix is required for client-side access. These are visible in the bundle — proxy secret keys before production.
- **Reanimated plugin**: must be the **last** entry in `babel.config.js` plugins, or animations silently no-op.

---

## Design System

### Theme: "Neon Dusk" (blend of Vapor + Neon Dusk + Candy Chrome)

Deep black-purple base with hot pink and soft sky blue accents. Feels like a high-stakes late-night arena. All colors defined as constants in `constants/theme.ts`.

```typescript
// constants/theme.ts
export const colors = {
  // Backgrounds
  bg: {
    void:    '#0E0016',   // deepest background
    base:    '#160022',   // screen background
    surface: '#1F0030',   // cards, panels
    elevated:'#2A0040',   // topbar, modals
  },

  // Accents
  pink:    '#FF5EE0',     // primary CTA — mic button, active state
  sky:     '#85C2FF',     // secondary — scores, info, timer fill
  gold:    '#FFD700',     // winner highlight, streak indicator
  coral:   '#FF6B8A',     // danger — timer warning, errors

  // Text
  text: {
    primary:   '#F0DDFF', // headings, primary labels
    secondary: '#A878CC', // muted labels, subtitles
    disabled:  '#5A3A7A', // placeholder, inactive
  },

  // Semantic
  win:  '#44FF88',        // round winner badge
  lose: '#FF4545',        // loser indicator
  tie:  '#FFD700',        // tie state
};

export const fonts = {
  display: 'Outfit_700Bold',   // app title, screen headings
  heading: 'Outfit_600SemiBold',
  body:    'Outfit_400Regular',
  mono:    'SpaceMono_400Regular', // scores, timer countdown
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};
```

### Install fonts

```bash
npx expo install @expo-google-fonts/outfit @expo-google-fonts/space-mono expo-font
```

In `app/_layout.tsx`:
```typescript
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
```

### NativeWind custom colors

Add to `tailwind.config.js`:
```js
module.exports = {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        void:    '#0E0016',
        base:    '#160022',
        surface: '#1F0030',
        elevated:'#2A0040',
        pink:    '#FF5EE0',
        sky:     '#85C2FF',
        gold:    '#FFD700',
        coral:   '#FF6B8A',
        win:     '#44FF88',
        lose:    '#FF4545',
      },
    },
  },
  plugins: [],
};
```

---

### Key Component Styles

#### Home screen cards (mode selection)
```tsx
<View className="bg-surface border border-pink/20 rounded-2xl p-5">
  <Text className="text-primary font-bold text-lg">Pass & Play</Text>
  <Text className="text-secondary text-sm mt-1">Same phone, take turns</Text>
</View>
```

#### Screen background pattern

Every screen uses `bg-base` as the root background. No gradients — the dark purple is enough depth. Use `bg-surface` for cards and `bg-elevated` for the top navigation bar.

```tsx
<SafeAreaView className="flex-1 bg-base">
  {/* screen content */}
</SafeAreaView>
```

---

### App Icon & Splash

Icon concept: microphone silhouette inside a glowing pink circle on void background.
- Generate at 1024×1024 PNG, no alpha channel
- Splash screen: `#0E0016` background, centered icon at 200×200
- In `app.json`:
```json
{
  "expo": {
    "splash": { "backgroundColor": "#0E0016", "resizeMode": "contain" },
    "android": { "backgroundColor": "#0E0016" },
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "DebateAI records your spoken arguments to transcribe and judge them."
      }
    },
    "android.permissions": ["RECORD_AUDIO"]
  }
}
```

---

## Deployment Checklist

- [ ] All API keys in `.env`, not hardcoded
- [ ] `.env` in `.gitignore`
- [ ] Secret model keys moved behind a proxy (production only)
- [ ] App icon 1024×1024px PNG (no alpha)
- [ ] Privacy policy URL (required by both stores)
- [ ] Microphone permission string in `app.json` (`NSMicrophoneUsageDescription` + Android `RECORD_AUDIO`)
- [ ] Firebase Realtime Database rules locked to authenticated-only
- [ ] Test on real device (Whisper + ElevenLabs won't work reliably in simulator)
- [ ] `eas build --profile production --platform all`
- [ ] `eas submit --platform ios` + `eas submit --platform android`
