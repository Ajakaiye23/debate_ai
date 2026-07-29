// Text-to-speech using the device's built-in speech engine — free, instant,
// works offline, and needs no API key. All screens speak through here.

import * as Speech from 'expo-speech';
import { getSettings } from '@/store/settings';

/** Speaks `text` aloud with the device voice. Resolves when playback ends. */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      volume: getSettings().judgeVolume ?? 1,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}
