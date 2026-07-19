# DebateAI — Fill-in form

Everything inside the app is built. **Only two things are left that I can't do
without you: the ads and the audio.** Both just need values/files from you.

Fill in the blanks below and hand this back to me (or paste just the section
you've completed). Anything marked *optional* can stay blank forever.

---

## SECTION A — Required to run the app

**A1. Anthropic API key** (from console.anthropic.com → API Keys)
```
ANTHROPIC_API_KEY = ________________________________________
```

**A2. Render proxy URL** (after you deploy — Step 2 of OWNER_GUIDE)
```
PROXY_URL = https://__________________________.onrender.com
```
> Once you give me A2, I connect the app to it. That's the last setup step.

---

## SECTION B — AUDIO  ⬅ one of the two remaining

The sound system isn't built yet. Tell me which sound to use for each slot and
I'll convert it, build the sound manager, and wire every trigger.

Source library: `C:\Users\blkg2\Pin_Pull\Audio\` (folders: `ui`, `impacts`,
`jingles`, `cards-casino`, `footsteps`)

**B1. The core six** (do these first — biggest impact)
```
verdict / gavel      = ________________________________  (suggest impacts/impactWood_heavy_00_.ogg)
winner sting         = ________________________________  (suggest jingles/jingles_STEEL__.ogg)
score card appears   = ________________________________  (suggest ui/confirmation_00_.ogg)
countdown tick       = ________________________________  (suggest ui/tick_00_.ogg)
button tap           = ________________________________  (suggest ui/click_00_.ogg)
chip / toggle select = ________________________________  (suggest ui/switch_00_.ogg)
```

**B2. The rest** *(optional — leave blank and I'll skip them)*
```
recording starts     = ________________________________
turn submitted       = ________________________________
fallacy flagged      = ________________________________
mic fail / error     = ________________________________
back / close screen  = ________________________________
start debate (CTA)   = ________________________________
tie result           = ________________________________
```

**B3. Two decisions**
```
Sound ON by default?          [ ] yes   [ ] no        (I suggest yes, at low volume)
UI clicks, or haptics only?   [ ] clicks   [ ] haptics only
```
> Note: true iOS/Android *system* click sounds need a native module + a real
> build (not Expo Go). If you pick "clicks," tell me whether you want that
> native route or a bundled click from the library above.

---

## SECTION C — ADS & PURCHASE  ⬅ the other remaining item

Needs your developer accounts first (OWNER_GUIDE Step 4). The code hooks are
already in place — I just paste these in.

**C1. AdMob** (admob.google.com — create app + one Interstitial per platform)
```
iOS app ID          = ca-app-pub-________________________
iOS interstitial ID = ca-app-pub-________________________
Android app ID          = ca-app-pub-____________________
Android interstitial ID = ca-app-pub-____________________
```

**C2. RevenueCat** (revenuecat.com — two products)
```
Apple public API key   = appl_____________________________
Google public API key  = goog_____________________________
Premium product ID     = premium   (unlimited + voices + no ads)
Remove-ads product ID  = ad_free   (cheaper, ads-only removal — optional)
```

**C3. Ad frequency**
```
Show an ad after every ____ debates   (I suggest 2 — every debate is too much)
```

---

## SECTION D — Store listing *(only when you're ready to publish)*

```
Privacy policy URL = ________________________________________
Support email      = ________________________________________
App subtitle       = ________________________________________  (30 chars max)
```
> Say "host the privacy policy" and I'll put the page online free and fill the URL.

---

## SECTION E — Multiplayer *(optional)*

From console.firebase.google.com → your project → Project settings.
```
FIREBASE_API_KEY      = ________________________________
FIREBASE_PROJECT_ID   = ________________________________
FIREBASE_DATABASE_URL = https://______________.firebasedatabase.app
```
> Multiplayer is built but untested. Without these it stays cleanly hidden —
> nothing breaks.

---

## Your action checklist

- [ ] **1.** Make a new Anthropic key, delete the old one → fill **A1**
- [ ] **2.** Deploy on Render (paste key, deploy) → fill **A2**
- [ ] **3.** Test the app on your iPhone (Expo Go + `start.cmd`)
- [ ] **4.** Pick your sounds → fill **SECTION B**
- [ ] **5.** *(to publish)* Apple Developer account, $99/yr
- [ ] **6.** *(to publish)* AdMob + RevenueCat → fill **SECTION C**
- [ ] **7.** *(to publish)* Screenshots + privacy policy → fill **SECTION D**
- [ ] **8.** *(optional)* Firebase → fill **SECTION E**

Steps 1–4 cost nothing. Steps 5–7 are the paid store path.
