// Interstitial ads — shown once after each finished debate, unless the user
// bought "remove ads".
//
// STUB: the real ad SDK (react-native-google-mobile-ads) is a native module
// that needs a dev build (not Expo Go) and an AdMob account. Until those
// exist, maybeShowInterstitial resolves immediately and the app behaves as
// ad-free. To wire it up later:
//   1. `npx expo install react-native-google-mobile-ads` + add its config
//      plugin to app.json with the AdMob app IDs.
//   2. Replace showInterstitial() below with InterstitialAd.createForAdRequest
//      (load on debate start, show here), keeping the adFree gate.
//   3. `eas build` — ads will not work in Expo Go.

import { getSettings } from '@/store/settings';

async function showInterstitial(): Promise<void> {
  // No ad SDK installed yet — no-op.
}

/** Call after a debate finishes. Resolves when the ad closes (or instantly). */
export async function maybeShowInterstitial(): Promise<void> {
  if (getSettings().adFree) return;
  try {
    await showInterstitial();
  } catch {
    // Never let an ad failure block the results screen.
  }
}
