import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { resolveKey, getSettings } from '@/store/settings';
import { PROXY_URL, usingProxy } from '@/services/proxy';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Synthesizes `text` with ElevenLabs and plays it. Resolves when playback finishes.
 * Streams the MP3 to a cache file and plays the file URI — works on iOS + Android.
 */
export async function speakText(text: string, voiceOverride?: string): Promise<void> {
  const voiceId =
    voiceOverride || resolveKey('elevenVoiceId', process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID);
  if (!voiceId) {
    console.warn('ElevenLabs voice not configured — skipping spoken verdict.');
    return;
  }

  let res: Response;
  if (usingProxy()) {
    res = await fetch(`${PROXY_URL}/api/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    });
  } else {
    const key = resolveKey('elevenLabsKey', process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY);
    if (!key) {
      console.warn('ElevenLabs not configured — skipping spoken verdict.');
      return;
    }
    res = await fetch(`${ELEVEN_BASE}/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'content-type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        // Flash: half the credits per character of the classic models, much lower latency.
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
  }

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  }

  // Write the binary response straight to a cache file (no base64 round-trip).
  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File(Paths.cache, `tts-${Date.now()}.mp3`);
  file.create({ overwrite: true });
  file.write(bytes);

  await setAudioModeAsync({ playsInSilentMode: true });

  const player = createAudioPlayer({ uri: file.uri });
  player.volume = getSettings().judgeVolume ?? 1;
  player.play();

  await new Promise<void>((resolve) => {
    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status?.didJustFinish) {
        sub.remove();
        resolve();
      }
    });
  });

  player.remove();
  try {
    file.delete();
  } catch {
    // best-effort cleanup
  }
}

/** Fetches the user's available ElevenLabs voices for the settings picker. */
export async function fetchVoices(): Promise<{ voice_id: string; name: string }[]> {
  const key = resolveKey('elevenLabsKey', process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY);
  if (!key) return [];
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': key },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { voices?: { voice_id: string; name: string }[] };
  return (data.voices ?? []).map((v) => ({ voice_id: v.voice_id, name: v.name }));
}
