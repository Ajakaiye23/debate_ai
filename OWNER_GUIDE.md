# DebateAI — What YOU need to do

The app is built. These steps need your accounts, your card, or your phone —
the things code can't do for itself. Do them top to bottom.

Only **one** API key matters: your **Anthropic key**. Everything else is optional.

You're on **iPhone**, so this guide uses the iPhone path throughout.

---

# PART A — Use it on your iPhone (free, ~30 min total)

## Step 1 — Make a fresh Anthropic key (5 min)

An old key of yours leaked in a chat once, so replace it.

1. Go to **console.anthropic.com** → sign in → **API Keys**.
2. Click **Create Key** and copy it somewhere safe.
3. Delete the old key on that same page.

## Step 2 — Put the key on a free server (15 min)

This lets the app talk to Claude without your key being buried inside the app.
Your code is already on GitHub, so this is quick.

1. Go to **render.com** → sign up (free) → **New → Blueprint**.
2. Connect GitHub and pick the **debate_ai** repo. Render configures itself.
3. When it asks for environment variables, fill in **only one**:
   - `ANTHROPIC_API_KEY` = your new key from Step 1
   - Leave the other two boxes blank.
4. Click **Deploy** and wait ~2 minutes.
5. It gives you a web address like `https://debateai-proxy.onrender.com`.
   Open it in a browser — if it says **"DebateAI proxy is running,"** it worked.
6. **Send me that address** and I'll connect the app to it. (One tiny edit — you
   don't have to touch any code.)

> The free server naps when unused, so the first debate after a quiet spell
> takes ~30 seconds to wake up. Totally normal.

## Step 3 — Open it on your iPhone (10 min)

1. On your iPhone, install **Expo Go** from the App Store (free).
2. On your PC, double-click **`start.cmd`** in the project folder. A window opens
   with a **QR code**.
3. Open the iPhone **Camera** app, point it at the QR code, tap the banner.
   DebateAI launches inside Expo Go.

**You can now play full debates.** One note: in Expo Go, tap **"Type instead"**
to enter arguments (spoken voice input needs the real app from Part B). Everything
else — judging, scores, coaching, verdicts read aloud — works.

Keep that `start.cmd` window open while you use it. Closing it disconnects the app.

---

# PART B — Only if you want it as a real iPhone app (no PC, spoken voice)

To get DebateAI as its own icon on your phone that works anywhere — and to unlock
**spoken voice input** — Apple requires a paid developer account. There's no free
way around this on iPhone.

## Step 4 — Apple Developer account ($99/year)

1. Go to **developer.apple.com** → enroll. It's $99/year and verifies your
   identity (can take a day or two).

## Step 5 — I build it, you install it via TestFlight

Once you have the account:
1. Sign up free at **expo.dev**.
2. Tell me **"build the iPhone app"** — I'll walk you through the two commands
   (you'll log in and answer a couple of prompts; Apple certificates are handled
   automatically).
3. Apple emails you a **TestFlight** link. Install the **TestFlight** app from the
   App Store, tap the link, and DebateAI installs like a normal app.

That's a real, standalone app on your phone — no computer, no Expo Go, and spoken
voice input works.

---

# PART C — Only if you want to sell it on the App Store

Do this after Part B. Tell me when you reach it and I'll handle the technical parts.

1. **Screenshots** — take a few on your iPhone (home, a debate, results).
2. **Privacy policy** — tell me **"host the privacy policy"** and I'll put the
   required page online for free and give you the link Apple asks for.
3. **Ads / the $4.99 "remove ads"** (optional income) — only if you want them:
   - Ads: sign up at **admob.google.com**, then tell me **"wire up AdMob."**
   - Purchase: sign up free at **revenuecat.com**, then tell me **"wire up
     RevenueCat."**
   - The code is already prepared for both — I just add your IDs.
4. **Submit** — tell me **"submit to the App Store"** and I'll run the upload with
   you (TestFlight first, then public review).

---

# PART D — Only if you want online multiplayer

Multiplayer is built but untested. To switch it on:

1. Go to **console.firebase.google.com** → Add project.
2. Inside it: **Build → Realtime Database → Create**.
3. **Project settings → Add app → Web** → copy the `apiKey` and `projectId`.
4. Send those to me and I'll plug them in.
5. Testing a real match needs two phones.

---

## Quick answers

- **Which key do I need?** Just the Anthropic one. About 10 cents per debate.
- **Do I need OpenAI or ElevenLabs keys?** No. Voice (listening and speaking) is
  free and built in. Add ElevenLabs later only if you want fancier AI voices.
- **Can I use it without paying Apple?** Yes — Part A (Expo Go) is free and fully
  playable; just type your arguments instead of speaking. Paying Apple is only for
  a standalone app and spoken input.
- **Stuck on a step?** Tell me the step number and what you saw.
