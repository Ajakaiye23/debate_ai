// On-device speech-to-text — free, instant, offline-capable. Falls back to
// Whisper (services/whisper.ts) when the native module isn't available
// (e.g. Expo Go — expo-speech-recognition needs a dev build).
//
// Usage from the debate flow:
//   if (await startListening()) { ... later: const text = await stopListening(); }
//   else record audio and send it through transcribeAudio() as before.

// Guarded require: resolves in dev/EAS builds, harmless if native side is missing.
let mod: typeof import('expo-speech-recognition') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-speech-recognition');
  // In Expo Go the JS loads but the native module is absent — probe for it.
  if (!mod?.ExpoSpeechRecognitionModule?.getStateAsync) mod = null;
} catch {
  mod = null;
}

let finals: string[] = [];
let interim = '';
let subs: { remove(): void }[] = [];
let endedResolve: (() => void) | null = null;

function cleanup() {
  subs.forEach((s) => s.remove());
  subs = [];
  endedResolve = null;
}

/** True when on-device recognition can be used on this build. */
export function deviceSttAvailable(): boolean {
  return mod != null;
}

/**
 * Starts live on-device transcription. Returns false (without throwing) if the
 * module is unavailable or permission is denied — caller falls back to Whisper.
 */
export async function startListening(): Promise<boolean> {
  if (!mod) return false;
  try {
    const perm = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return false;

    finals = [];
    interim = '';
    subs.push(
      mod.ExpoSpeechRecognitionModule.addListener('result', (e) => {
        const t = e.results?.[0]?.transcript ?? '';
        if (e.isFinal) {
          if (t) finals.push(t);
          interim = '';
        } else {
          interim = t;
        }
      }),
      mod.ExpoSpeechRecognitionModule.addListener('end', () => {
        endedResolve?.();
      })
    );
    mod.ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
    return true;
  } catch {
    cleanup();
    return false;
  }
}

/** Stops listening and returns everything heard. Empty string = heard nothing. */
export async function stopListening(): Promise<string> {
  if (!mod) return '';
  try {
    const ended = new Promise<void>((resolve) => {
      endedResolve = resolve;
    });
    mod.ExpoSpeechRecognitionModule.stop();
    // Give the recognizer up to 1.5s to flush its final segment.
    await Promise.race([ended, new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    // fall through with whatever we collected
  }
  const text = [...finals, interim].join(' ').replace(/\s+/g, ' ').trim();
  cleanup();
  finals = [];
  interim = '';
  return text;
}

/** Cancels listening and discards the transcript (e.g. user switched to typing). */
export function abortListening(): void {
  try {
    mod?.ExpoSpeechRecognitionModule.abort();
  } catch {
    // ignore
  }
  cleanup();
  finals = [];
  interim = '';
}
