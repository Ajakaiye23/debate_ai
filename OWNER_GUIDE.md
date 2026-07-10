# DebateAI — What YOU need to do

The app is built. These are the only things the code can't do for itself — they
need your accounts, your card, or your phone. Do them top to bottom.

Only **one** API key matters: your **Anthropic key**. Everything else is optional.

---

# PART A — Get it running (do this first)

## Step 1 — Make a fresh Anthropic key (5 min)

An old key of yours leaked in a chat, so replace it.

1. Go to **console.anthropic.com** → sign in → **API Keys**.
2. Click **Create Key**, copy it.
3. Delete the old key from that same page.

Keep the new key handy for Step 2. Don't paste it anywhere public.

## Step 2 — Put the key on a free server (15 min)

This is what lets the app talk to Claude without your key being inside the app.

1. Make sure your code is on GitHub. If you're not sure, tell me "push to GitHub"
   and I'll do it.
2. Go to **render.com** → sign up (free) → **New → Blueprint**.
3. Connect your GitHub and pick the **debate_ai** repo. Render sets everything up
   on its own.
4. When it asks for environment variables, fill in **one**:
   - `ANTHROPIC_API_KEY` = your new key from Step 1
   - (Leave `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` blank — not needed.)
5. Click **Deploy**. Wait ~2 min. You'll get a web address like
   `https://debateai-proxy.onrender.com`.
6. Open that address in your browser. If it says **"DebateAI proxy is running,"**
   it worked.

Tell me the address and I'll point the app at it (one small edit). Or do it
yourself: in `debate_ai/.env`, set `EXPO_PUBLIC_PROXY_URL=` to that address.

> The free server "sleeps" when unused, so the very first debate after a quiet
> spell takes ~30 seconds to wake up. Normal. Upgrade later if it bugs you.

## Step 3 — Put the real app on your phone (20 min, mostly waiting)

Right now you test through "Expo Go." This turns DebateAI into its own app with
its own icon that works anywhere — no computer, no Expo Go.

1. Go to **expo.dev** → sign up (free).
2. Open a terminal in the project and run these three lines:
   ```
   cd C:\Users\blkg2\debate_ai
   set PATH=%CD%\nodejs;%PATH%
   npx eas login
   npx eas build --profile preview --platform android
   ```
3. It builds in the cloud (~15 min). When done it gives you a link.
4. Open that link **on your Android phone** → download → install (allow
   "install unknown apps" if it asks).

Done — DebateAI is on your home screen. Redo step 3's `build` line whenever you
want the latest changes on your phone.

**That's it — the app is fully usable at this point.** Everything below is only
if you want to publish it to the app stores or add multiplayer.

---

# PART B — Only if you want to publish to the app stores

Do these in order. They cost money and take a few days for approvals, so start
early.

## Step 4 — Buy developer accounts

- **Google Play**: $25, one time — play.google.com/console
- **Apple** (only if you want iPhone): $99/year — developer.apple.com

Both verify your identity, which can take a day or two.

## Step 5 — Screenshots + privacy policy

- Take a few screenshots on your phone (home screen, a debate, the results).
- Tell me "host the privacy policy" — I'll get the required privacy-policy page
  online for free and give you the link the stores ask for.

## Step 6 — Ads and the $4.99 "remove ads" (optional money-makers)

Only if you want ads. After Step 4:
- **Ads**: sign up at admob.google.com, add the app, create one "Interstitial"
  ad. Then tell me **"wire up AdMob"** and paste what it gives you.
- **Remove-ads purchase**: sign up at revenuecat.com (free), then tell me
  **"wire up RevenueCat"** and paste the keys.

The code is already prepared for both — I just plug your IDs in.

## Step 7 — Submit

When you're ready, tell me **"submit to the stores"** and I'll walk you through
the build-and-upload commands with you (Apple TestFlight + Google internal
testing first, then public).

---

# PART C — Only if you want online multiplayer

Multiplayer is built but untested. To turn it on:

1. **console.firebase.google.com** → Add project.
2. Inside it: **Build → Realtime Database → Create**.
3. **Project settings → Add app → Web** → copy the `apiKey` and `projectId`.
4. Send those to me (or paste into `.env`: `EXPO_PUBLIC_FIREBASE_API_KEY`,
   `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, and the database URL).
5. Needs two phones to actually test a match.

---

## Quick answers

- **Which keys do I need?** Just the Anthropic one. That's it.
- **What does a debate cost me?** About 10 cents.
- **Do I need OpenAI or ElevenLabs?** No. On-device voice (both listening and
  speaking) is free and built in. Add ElevenLabs later only if you want fancier
  AI voices.
- **Something's broken / I'm stuck.** Tell me which step and what you saw.
