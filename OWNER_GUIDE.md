# Debate Me — Your Step-by-Step Guide

Everything *you* need to do, in the order to do it. Written for clicking, not
coding. Each part says how long it takes and whether it's required.

**Jump to:**
- [Part 0 — See the app running (5 min)](#part-0--see-the-app-running)
- [Part 1 — Do these this week (20 min)](#part-1--do-these-this-week)
- [Part 2 — Test it properly (30 min)](#part-2--test-it-properly)
- [Part 3 — Before anyone else uses it](#part-3--before-anyone-else-uses-it)
- [Part 4 — The Congressional App Challenge](#part-4--the-congressional-app-challenge)
- [Troubleshooting](#troubleshooting)

---

## Part 0 — See the app running

**Time: 5 minutes. Do this first.**

### 1. Put Expo Go on your phone
Search **"Expo Go"** in the App Store or Play Store and install it. This is the
app that runs your app. It's free.

### 2. Start the server on your PC
In the `debate_ai` folder, **double-click `start.cmd`**.

A black window opens. Leave it open — *that window is the server*. Closing it
kills the connection. After 30–60 seconds a **QR code** appears.

### 3. Scan the QR code
- **iPhone:** open the Camera app, point it at the QR code, tap the banner.
- **Android:** open Expo Go, tap "Scan QR code".

First load takes 30–60 seconds while it sends the app to your phone.

### 4. Try the full loop
This is also your demo-video run-through:

1. Tap **Solo vs AI**
2. Type any topic (e.g. "Homework should be banned")
3. Pick your side → **Start Debate**
4. Speak your argument when it counts down (or tap **Type instead**)
5. Watch it score you and read the verdict
6. On the results screen tap **Practice your [weak skill]**
7. Do the drill, then go **Home → Progress** to see your skill bars

> **Note:** if speaking doesn't work, that's expected — see
> [OpenAI credits](#speaking-doesnt-work-transcription-error) below. **Type
> instead** works regardless and shows off everything else.

---

## Part 1 — Do these this week

**Time: ~20 minutes total. All three are required before anyone else uses the app.**

### 1a. Replace your Anthropic key — 5 min ⚠️ REQUIRED

Your current key was pasted into a chat window, so treat it as public.

1. Go to **console.anthropic.com**
2. **Settings → API Keys**
3. Find your current key → **delete** it
4. **Create Key** → copy the new one
5. Open `debate_ai\.env` in Notepad
6. Replace the value after `EXPO_PUBLIC_ANTHROPIC_API_KEY=` with the new key
7. Save. Restart `start.cmd` if it's running.

**Don't paste the new key into any chat, including with me.**

### 1b. Create the Firebase project — 5 min

Online multiplayer and the leaderboard have never actually run, because there's
no database yet. This creates a free one.

1. Go to **console.firebase.google.com** → **Create a project**
2. Name it `Debate Me` → you can turn Google Analytics **off** → Create
3. In the left menu: **Build → Realtime Database → Create Database**
4. Pick any location → choose **Start in test mode** → Enable
5. Click the **gear icon (⚙️) → Project settings**
6. Scroll to **Your apps** → click the **web icon `</>`**
7. Nickname it `Debate Me` → Register app
8. You'll see a code block. Copy these three values into `debate_ai\.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=      ← the "apiKey" value
EXPO_PUBLIC_FIREBASE_PROJECT_ID=   ← the "projectId" value
EXPO_PUBLIC_FIREBASE_DATABASE_URL= ← the "databaseURL" value
```

9. Save `.env` and restart `start.cmd`.

> If `databaseURL` isn't in that code block, get it from **Realtime Database** —
> it's the URL at the top, like `https://debate-me-xxxx.firebaseio.com`.

### 1c. Lock down the database — 5 min ⚠️ REQUIRED

You just chose "test mode", which means **anyone on the internet can read every
debate and rewrite anyone's ranking**. Fix that now:

1. In Firebase: **Build → Realtime Database → Rules** tab
2. Open `debate_ai\firebase.rules.json` in Notepad
3. Select all, copy
4. Paste it over everything in the Rules box
5. Click **Publish**

You should see the warning about public access disappear.

---

## Part 2 — Test it properly

**Time: ~30 min. Nothing below has ever run on a real phone.**

Work through these and tell me anything that looks wrong:

| What to test | How | What should happen |
|---|---|---|
| **Practice loop** | Finish a debate → **Practice your [skill]** | A drill appears, you answer, you get a score + a rewrite |
| **Progress dashboard** | Home → **Progress** | Bars per skill, your weakest one outlined in red |
| **Formal debate** | Home → **Formal Debate** | Opening → cross-examination (a real back-and-forth) → closing |
| **2v2** | Formal Debate → switch to **2v2** | Four speakers, team names, 14 turns |
| **Prep time** | Formal setup → prep 1 min | A silent timer before openings, skippable |
| **Multiplayer** | Two phones. One **Start a party**, other **Join** with the code | Turns pass between phones |
| **Leaderboard** | Home → **Ranks** after an online match | Your name with a rating |
| **Quit mid-debate** | Start a debate → tap the **X** | Asks to confirm, returns home cleanly |

---

## Part 3 — Before anyone else uses it

**Only needed when someone other than you will run the app.**

Right now your API keys are bundled inside the app. That's fine while you're the
only user, but anyone who installs it could extract them and spend your money.
The fix is a small server that holds the keys instead.

### Deploy the proxy — 20 min

1. Push this project to **GitHub** (if it isn't already)
2. Go to **render.com** → sign up free → **New → Blueprint**
3. Connect your GitHub and pick this repo. Render reads `render.yaml`
   automatically and knows what to build.
4. It will ask you for these values:
   - `ANTHROPIC_API_KEY` — your new key from step 1a
   - `OPENAI_API_KEY` — leave blank unless you're paying for voice input
   - `APP_KEY` — **invent a long random password** (30+ characters, any mix of
     letters and numbers). Save it somewhere; you need it in the next step.
5. Click **Create**. Wait for it to deploy, then copy the URL it gives you
   (something like `https://debateme-proxy.onrender.com`)
6. In `debate_ai\.env`, fill in:

```
EXPO_PUBLIC_PROXY_URL=https://debateme-proxy.onrender.com
EXPO_PUBLIC_APP_KEY=          ← the exact same random password from step 4
```

7. Save, restart `start.cmd`, run a debate. If it still scores you, the proxy is
   working.
8. Now **delete the key values** from the `EXPO_PUBLIC_ANTHROPIC_API_KEY` and
   `EXPO_PUBLIC_OPENAI_API_KEY` lines — the app no longer needs them.

> Render's free tier sleeps after inactivity, so the first request after a quiet
> period takes ~30 seconds to wake up. Normal.

---

## Part 4 — The Congressional App Challenge

**Deadline: October 26, 2026, 12:00 p.m. ET**

### What you actually submit
- A **demo video, 3 minutes maximum**
- **Written responses** about the app and the technical challenges you hit
- Your **code**

### You do NOT need an app store

The Challenge is judged on the video, your answers, and the code. You do **not**
need an Apple ($99/yr) or Google Play ($25) account, and you don't need the app
published. Skip all of that unless you separately want it in the stores.

### Filming the demo

**`DEMO_SCRIPT.md` is the full shooting script** — what to set up before you
record, the shot list with timings, and what to leave out. The short version:

Record your phone screen (iPhone: Settings → Control Centre → add **Screen
Recording**). Suggested 3 minutes:

| Time | What to show |
|---|---|
| 0:00 | The problem: getting better at arguing needs someone to argue with |
| 0:20 | Home screen, pick a mode, enter a topic |
| 0:35 | **Actually debate it out loud** — this is the moment that sells it |
| 1:20 | The AI challenges a point and you rebut |
| 1:50 | Debate ends, verdict is read aloud |
| 2:00 | Scorecard + fact-checking + fallacies it caught |
| 2:25 | **It identified your weakest skill** ← your differentiator |
| 2:35 | Tap **Practice this weakness**, do a drill |
| 2:50 | Progress dashboard showing improvement over time |

The last 30 seconds is what separates this from "a chatbot that argues." Don't
rush it.

### Writing the technical answers

Judges want to see *you* understand your own code. Read **`CODE_TOUR.md`** — it
explains how a debate flows through the app and the reasoning behind the three
most interesting design decisions, in plain language. Good things to talk about:

- **The segment engine** — how one flat list of turns lets one screen run quick
  matches, formal debates, and 2v2 without special cases
- **Why ELO instead of counting wins** — win-count rewards playing a lot, not
  playing well
- **Making AI output safe to use** — the model sometimes wraps its JSON in extra
  text, which would crash the app; `src/utils/json.ts` handles that
- **The problems you fixed by watching people use it** — hold-to-talk being
  wrong, nobody knowing whose turn it was, cross-examination not being a real
  exchange

Also read **`SECURITY.md`** — being able to say "these 8 checklist items don't
apply to my app, and here's why" is a stronger answer than claiming you did all
20.

---

## Troubleshooting

### `node` or `npx` is not recognized
The terminal was opened before Node was installed, or isn't using the copy
inside this project. **Use `start.cmd`** instead of typing commands — it points
at the right Node automatically.

### The black window closes instantly
It hit an error too fast to read. Open PowerShell, then:
```powershell
cd C:\Users\blkg2\debate_ai
.\start.cmd
```
The error stays on screen. Send it to me.

### Phone says `ERR_NGROK_3200` or won't connect
The server window was closed. That window *is* the server — reopen `start.cmd`
and keep it open the whole time you're using the app.

### Phone says "update Expo Go" / SDK mismatch
The project is deliberately pinned to Expo SDK 54 to match your Expo Go. Don't
upgrade Expo packages — it breaks phone testing.

### Speaking doesn't work / transcription error
Cloud speech-to-text needs credit on your **OpenAI** account (separate from
Anthropic). Either:
- add a few dollars at **platform.openai.com → Billing**, or
- just use **Type instead** — everything else works identically.

(A future standalone build can use free on-device speech recognition instead,
which removes the OpenAI dependency entirely.)

### Nothing scores / "judge could not be reached"
Your Anthropic key is missing, wrong, or out of credit. Check `.env`, and check
your balance at console.anthropic.com.

### I broke something in .env
Every line is `NAME=value` with no spaces around the `=`. Blank values are fine
— a blank key just turns that feature off.
