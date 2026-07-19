// One-time "Remove ads" purchase ($4.99).
//
// STUB: real in-app purchases need RevenueCat (react-native-purchases — a
// native module requiring a dev build) plus App Store / Play Console products,
// which need the developer accounts. Until then, purchase attempts explain
// they're coming soon. To wire up later:
//   1. `npx expo install react-native-purchases`, configure with the
//      RevenueCat public API keys.
//   2. Create a non-consumable "ad_free" product in both stores + RevenueCat.
//   3. Replace the two functions below with Purchases.purchaseProduct /
//      Purchases.restorePurchases, keeping the updateSettings({adFree}) calls.

import { updateSettings } from '@/store/settings';

export const AD_FREE_PRICE = '$4.99';
export const PREMIUM_PRICE = '$4.99';

export interface PurchaseOutcome {
  ok: boolean;
  message: string;
}

export async function purchaseAdFree(): Promise<PurchaseOutcome> {
  // No store connection yet — do not grant the entitlement.
  return {
    ok: false,
    message: 'Purchases are coming with the store release — ads are off during the beta.',
  };
}

/** Premium = unlimited debates + ElevenLabs voices + no ads. */
export async function purchasePremium(): Promise<PurchaseOutcome> {
  // No store connection yet — do not grant the entitlement.
  return {
    ok: false,
    message:
      'Premium unlocks with the store release. For unlimited debates now, add your own Anthropic key in Settings.',
  };
}

export async function restorePurchases(): Promise<PurchaseOutcome> {
  return { ok: false, message: 'Nothing to restore yet — purchases arrive with the store release.' };
}

/** Called by the purchase flow once a real "remove ads" transaction succeeds. */
export async function grantAdFree(): Promise<void> {
  await updateSettings({ adFree: true });
}

/** Called once a real premium transaction succeeds (premium also removes ads). */
export async function grantPremium(): Promise<void> {
  await updateSettings({ premium: true, adFree: true });
}
