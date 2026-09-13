# Debate Me — Code Tour

A guided walkthrough of how this app is built. Start here if you want to find
something, understand how a debate actually runs, or see the parts I think are
the most interesting engineering.

---

## Where things live

Everything I wrote is under `src/`. (`node_modules/` is downloaded
dependencies — not my code.)

```
src/
├── app/          Screens. One file = one screen, and the filename is the route.
│   ├── index.tsx        Home — pick a mode
│   ├── setup.tsx        Choose topic, sides, rounds, timing
│   ├── debate.tsx       The live debate (the biggest file — the main loop)
│   ├── results.tsx      Verdict, scorecard, coaching
│   ├── history.tsx      Past debates
│   ├── settings.tsx     Preferences
│   ├── multiplayer.tsx  Online lobby — create/join a room by code
│   ├── mp-debate.tsx    The online version of the debate screen
│   ├── leaderboard.tsx  ELO rankings
│   ├── progress.tsx     Skill dashboard — averages, trends, weakest skill
│   └── practice.tsx     A single targeted drill on one weak skill
│
├── components/   Reusable pieces of UI shared across screens
│   ├── Primitives.tsx      Button, Chip, Screen wrapper (the design system)
│   ├── ArgumentCard.tsx    One scored argument
│   ├── TimerBar.tsx        The countdown bar
│   ├── MicButton.tsx       Recording indicator
│   ├── VerdictBanner.tsx   Winner announcement
│   ├── DuskBackground.tsx  The glow behind every screen
│   └── ErrorBoundary.tsx   Catches crashes so users see a retry, not a blank app
│
├── hooks/        Reusable logic (React's way of sharing behaviour, not looks)
│   ├── useDebateState.ts   THE STATE MACHINE — runs the whole debate
│   ├── useAudioRecorder.ts Microphone start/stop/pause
│   └── useTimer.ts         Countdown with pause/resume
│
├── services/     Anything that talks to the outside world
│   ├── claude.ts     Asks the AI to score arguments and write verdicts
│   ├── whisper.ts    Turns recorded speech into text
│   ├── stt.ts        On-device speech recognition (free; falls back to whisper)
│   ├── tts.ts        Reads verdicts aloud
│   ├── firebase.ts   Online multiplayer rooms + ratings
│   ├── elo.ts        Rating math
│   ├── progress.ts   Turns saved debates into skill averages + weakest skill
│   ├── proxy.ts      Decides whether keys go through my server
│   └── sounds.ts     Sound effects
│
├── store/        Data that outlives a single screen (saved on the device)
│   ├── settings.ts      User preferences
│   ├── debateHistory.ts Past debates
│   ├── identity.ts      Anonymous player ID + display name
│   ├── usage.ts         Daily limit so API costs stay bounded
│   └── activeDebate.ts  Hands the current debate between screens
│
├── constants/
│   ├── format.ts   Defines the running order of each debate format
│   ├── prompts.ts  Every instruction sent to the AI
│   └── theme.ts    Colors, fonts, spacing
│
├── types/debate.ts  The shape of the app's data
└── utils/           json.ts (safe AI-output parsing), haptics.ts
```

Outside `src/`: `server/` is the small backend that hides the API keys, and
`assets/` holds icons and sounds.

---

## How one debate actually runs

This is the path through the code if you follow a single turn:

1. **`setup.tsx`** collects the topic, sides, and timing, then asks
   **`constants/format.ts`** to build the running order.
2. **`hooks/useDebateState.ts`** takes that running order and tracks where we
   are. It's the referee's clipboard: whose turn, what's been said, what score.
3. **`app/debate.tsx`** draws whatever the state machine says is happening and
   drives the countdown → record → submit cycle.
4. The turn's audio goes to **`services/stt.ts`** (on-device, free) or
   **`services/whisper.ts`** (cloud) to become text.
5. That text goes to **`services/claude.ts`**, which sends it to the AI with the
   instructions in **`constants/prompts.ts`** and gets back scores plus notes.
6. **`services/tts.ts`** reads the result aloud, then the state machine advances
   to the next segment and the cycle repeats.
7. After the final segment, `claude.ts` writes the verdict and
   **`app/results.tsx`** shows the scorecard.

---

## The practice loop — what makes this more than an AI chatbot

Anyone can wire up a chatbot that argues back. The part I think is actually
useful is what happens *after* the debate:

```
debate  →  every turn scored on 4 skills
        →  progress.ts averages them across all past debates
        →  the lowest one is named as your weakness
        →  practice.tsx drills that one skill with a targeted exercise
        →  debate again and watch the number move
```

The pieces:
- **`src/services/progress.ts`** does the analysis. It only looks at *your* turns
  (not your opponent's, which would skew the numbers), needs a minimum number of
  turns before it will call something a weakness, and works out trend by
  comparing your recent half against your earlier half.
- **`src/app/progress.tsx`** shows it: a bar per skill, a trend arrow, and the
  weakest one highlighted with a button straight into a drill.
- **`src/app/practice.tsx`** runs one drill. Deliberately not a debate — no
  opponent, no rounds — because you can't fix your rebuttals while also worrying
  about clarity and facts.
- The two prompts in `src/constants/prompts.ts` are a matched pair: one invents
  an exercise for a single skill, the other grades the attempt against that same
  skill and nothing else.

---

## The three parts I'd point a judge at

### 1. The segment engine — `src/constants/format.ts`
A quick match and a formal 2v2 debate have nothing structurally in common, and
my first version handled that with branching logic spread across the debate
screen. I replaced it with a single idea: *any* debate is just an ordered list of
turns. The debate screen walks that list and never needs to know which format it
is running. Adding 2v2 later meant adding one list — no changes to the screen.

### 2. The debate state machine — `src/hooks/useDebateState.ts`
A turn passes through several stages (get ready → recording → transcribing →
judging → reading aloud → next), and each can fail. Keeping that in one place
means the screen only has to ask "what phase are we in?" and draw it, instead of
juggling a dozen booleans. It's also why pause, quit, and the "type instead"
fallback work everywhere without special-casing.

### 3. Making AI output safe to use — `src/utils/json.ts`
The AI is asked to reply in JSON, but language models sometimes wrap it in
markdown fences or add a sentence first. Calling `JSON.parse` directly on that
crashes. This helper strips the extra formatting, finds the actual JSON, and
throws a clear error if it truly can't parse — so a bad AI response shows a
retry instead of taking the app down. Every AI call goes through it.

---

## Security notes

- **API keys never ship in a release build.** In development the app can call
  the AI directly, but for release it routes through `server/index.mjs`, which
  holds the keys. See `SECURITY.md` for the full breakdown.
- **Daily usage cap** (`src/store/usage.ts`) so the API bill can't run away.
- **Users can supply their own API key** in Settings, which then runs on their
  account instead of mine.

---

## Running it yourself

```bash
npm install
npx expo start --tunnel
```

Then open it in Expo Go on a phone. `start.cmd` does the same thing on Windows
in one double-click.
