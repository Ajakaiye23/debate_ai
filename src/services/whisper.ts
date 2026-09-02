import * as LegacyFS from 'expo-file-system/legacy';
import { resolveKey } from '@/store/settings';
import { PROXY_URL, usingProxy, proxyHeaders } from '@/services/proxy';

/**
 * Transcribes a recorded audio file via OpenAI Whisper — directly (bundled key)
 * or through the backend proxy when EXPO_PUBLIC_PROXY_URL is configured.
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  const name = audioUri.split('/').pop() ?? 'audio.m4a';
  const type = name.endsWith('.wav')
    ? 'audio/wav'
    : name.endsWith('.mp4')
      ? 'audio/mp4'
      : name.endsWith('.caf')
        ? 'audio/x-caf'
        : 'audio/m4a';

  let res: Response;
  if (usingProxy()) {
    // Send the audio as base64 JSON; the proxy builds the multipart upload.
    const audioBase64 = await LegacyFS.readAsStringAsync(audioUri, {
      encoding: LegacyFS.EncodingType.Base64,
    });
    res = await fetch(`${PROXY_URL}/api/transcribe`, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify({ audioBase64 }),
    });
  } else {
    const key = resolveKey('openaiKey', process.env.EXPO_PUBLIC_OPENAI_API_KEY);
    if (!key) throw new Error('OpenAI API key not set — add it in Settings.');
    const form = new FormData();
    // React Native FormData accepts a file descriptor object.
    form.append('file', { uri: audioUri, name, type } as any);
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
  }

  if (!res.ok) {
    const body = await res.text();
    let detail = '';
    try {
      detail = JSON.parse(body)?.error?.message ?? '';
    } catch {
      // not JSON
    }
    if (res.status === 429) {
      throw new Error(
        'Speech-to-text is out of quota. Add billing credits to your OpenAI account (platform.openai.com → Billing), then try again.'
      );
    }
    if (res.status === 401) {
      throw new Error('Your OpenAI API key looks invalid — double-check it.');
    }
    throw new Error(`Transcription failed (${res.status}). ${detail}`.trim());
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? '').trim();
}
