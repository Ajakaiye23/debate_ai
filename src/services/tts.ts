// Unified text-to-speech: routes to ElevenLabs (premium, natural voices) or
// the device's built-in speech engine (free, near-instant, works offline)
// based on the ttsEngine setting. All screens speak through here.

import * as Speech from 'expo-speech';
import { speakText as speakElevenLabs } from '@/services/elevenlabs';
import { getSettings } from '@/store/settings';

function speakOnDevice(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      volume: getSettings().judgeVolume ?? 1,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}

/**
 * Speaks `text` aloud with the configured engine. Resolves when playback ends.
 * `voiceOverride` is an ElevenLabs voice id — ignored by the device engine
 * (device voices can't be per-player, but they're free and instant).
 */
export async function speak(text: string, voiceOverride?: string): Promise<void> {
  if (getSettings().ttsEngine === 'device') {
    return speakOnDevice(text);
  }
  return speakElevenLabs(text, voiceOverride);
}
