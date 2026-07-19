// Thin wrapper around expo-haptics so every tap in the app feels native.
// Fire-and-forget: haptics should never block or throw into the UI.

import * as Haptics from 'expo-haptics';

/** Light tick — buttons, card taps, general presses. */
export const tapLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

/** Selection change — chips, toggles, pickers. */
export const tapSelect = () => Haptics.selectionAsync().catch(() => {});

/** Success buzz — verdict revealed, purchase, match won. */
export const notifySuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

/** Warning buzz — timer running low, error. */
export const notifyWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
