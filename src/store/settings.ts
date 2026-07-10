import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'debateai:settings';

export interface AppSettings {
  anthropicKey: string;
  openaiKey: string;
  elevenLabsKey: string;
  elevenVoiceId: string;
  judgeVolume: number; // 0–1
  defaultRounds: number;
  defaultTurnDuration: number; // seconds
  readTurnSummaries: boolean; // false = skip per-turn TTS (faster debates); final verdict is always read
  adFree: boolean; // true after the one-time "remove ads" purchase
  ttsEngine: 'elevenlabs' | 'device'; // device = free built-in voice, instant + offline
}

const DEFAULTS: AppSettings = {
  anthropicKey: '',
  openaiKey: '',
  elevenLabsKey: '',
  elevenVoiceId: '',
  judgeVolume: 1,
  defaultRounds: 3,
  defaultTurnDuration: 30,
  readTurnSummaries: true,
  adFree: false,
  ttsEngine: 'elevenlabs',
};

// In-memory cache so services can read keys synchronously.
let cache: AppSettings = { ...DEFAULTS };

/** Load persisted settings into the cache. Call once at app startup. */
export async function initSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore — fall back to defaults
  }
  return cache;
}

/** Synchronous read of the current settings (post-init). */
export function getSettings(): AppSettings {
  return cache;
}

/** Merge + persist a partial update. */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  cache = { ...cache, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  return cache;
}

/** Reads a key, preferring the user-entered value over the bundled env var. */
export function resolveKey(
  field: 'anthropicKey' | 'openaiKey' | 'elevenLabsKey' | 'elevenVoiceId',
  envValue: string | undefined
): string {
  return cache[field] || envValue || '';
}
