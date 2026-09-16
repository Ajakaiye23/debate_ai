# Demo video — shooting script

For the Congressional App Challenge submission. **Three minutes maximum**, which
is about 450 spoken words, so every second has a job.

Deadline: **October 26, 2026, 12:00 p.m. ET**.

---

## Before you hit record

Four things, in this order. Skipping the first two wrecks the ending.

1. **Play 3–4 full debates first.** The Progress dashboard needs at least 3
   scored turns per skill before it will name a weakness (`MIN_SAMPLES` in
   `src/services/progress.ts`), and 4+ before trend arrows appear. Film on a
   fresh install and your closing shot is an empty screen.
2. **Paste your own Anthropic key into Settings.** The free tier is capped at
   10 debates/day (`src/store/usage.ts`) and retakes burn through that fast.
   Your own key makes it unlimited — and it's your key either way.
3. **Settings → "Read turn scores aloud" → Off.** Otherwise the app narrates
   every turn and you lose ~40 seconds to listening. Scores still appear on
   screen, and the final verdict is always read aloud — that's the bit you want.
4. **Setup: 2 rounds, 30-second turns.** The default 3 rounds × 60s is six
   minutes of raw footage to cut down.

Also: **Do Not Disturb on**, and screen recording ready (iPhone: Settings →
Control Centre → add Screen Recording).

---

## Decide first: do you speak, or type?

This changes the whole video. Speaking out loud is the moment that sells the
app — but in Expo Go it needs OpenAI credit, and it has **never been tested on
a real phone**. Test it days before filming, not on the day. If it doesn't
work, **Type instead** demos everything else identically well. Don't gamble the
submission on it.

---

## The three minutes

| Time | On screen | What you say |
|---|---|---|
| 0:00–0:15 | App icon / home screen | The problem: getting better at arguing takes someone to argue against who actually knows the facts. Most people don't have that |
| 0:15–0:30 | Tap **Solo vs AI**, type a real topic ("school should start later") | Any topic, typed in. Nothing preset |
| 0:30–1:10 | **Your argument** — spoken or typed. Then the AI's reply | This is the app working. Let it breathe |
| 1:10–1:40 | The AI challenges a point; you rebut | Name what's happening: it's responding to *your* claim, not reciting |
| 1:40–1:55 | Final verdict, read aloud | Let the audio play. Don't talk over it |
| 1:55–2:20 | Scorecard — accuracy / strength / clarity / rebuttal, fact-check notes, fallacy chips | "It caught the slippery slope here" — point at a *specific* one |
| 2:20–2:35 | **"Practice your [weakest skill]"** on the results screen | The thesis: it doesn't just score you, it knows what you're worst at |
| 2:35–2:50 | Do the drill — score, and the stronger rewrite | The rewrite is the teaching moment. Show it |
| 2:50–3:00 | **Progress** dashboard, bars and trend arrows | "Over ten debates my rebuttal went from 5 to 7." Close there |

The last 40 seconds is the whole video. Anyone can film an AI that argues back;
almost nobody films one that diagnoses you and then coaches you. Rehearse that
stretch until it's smooth, and let the debate itself run short if you have to.

---

## Leave these out

- **Code.** It's submitted separately and judges read it there. Fifteen seconds
  of scrolling a file costs you the practice-loop ending. The GitHub link goes
  in your written answers instead.
- **Multiplayer, 2v2, formal debate.** Built, but never verified on a phone.
  Never film an untested path — and a video showing every mode shows none well.
- **The Settings screen with your API key visible**, and obviously never `.env`.

---

## The written responses

Judges want to see you understand your own code. Read `CODE_TOUR.md` before
writing them — especially "The three parts I'd point a judge at". Good material:

- **The segment engine** (`src/constants/format.ts`) — one flat list of turns
  lets a single screen run quick matches, formal debates and 2v2 with no
  special cases.
- **Why ELO instead of counting wins** — win-count rewards playing a lot, not
  playing well.
- **Making AI output safe to use** (`src/utils/json.ts`) — the model sometimes
  wraps its JSON in extra text, which would crash the app.
- **Problems found by watching people use it** — hold-to-talk being wrong,
  nobody knowing whose turn it was, cross-examination not being a real exchange.

`SECURITY.md` is worth a mention too: "these checklist items don't apply to my
app, and here's why" is a stronger answer than claiming you did all twenty.
