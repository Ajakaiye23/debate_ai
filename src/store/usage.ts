import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSettings, hasUserAnthropicKey } from '@/store/settings';

// Free users get a capped number of debates per day (on the bundled/proxy key,
// which the app owner pays for). Premium users and users who supply their own
// Anthropic key are unlimited — premium pays for itself, and a BYO key runs on
// the user's own account, so neither costs the owner anything.

export const FREE_DAILY_LIMIT = 10;

const KEY = 'debateai:usage';

interface Usage {
  date: string; // local YYYY-MM-DD
  count: number;
}

let cache: Usage = { date: '', count: 0 };

const today = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Load persisted usage; roll over the counter if it's a new day. */
export async function initUsage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw);
  } catch {
    // ignore — start fresh
  }
  if (cache.date !== today()) cache = { date: today(), count: 0 };
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // best-effort
  }
}

function rollIfNeeded(): void {
  if (cache.date !== today()) cache = { date: today(), count: 0 };
}

/** True when the user isn't subject to the daily cap. */
export function isUnlimited(): boolean {
  return getSettings().premium || hasUserAnthropicKey();
}

/** Debates used today (free tier). */
export function debatesUsedToday(): number {
  rollIfNeeded();
  return cache.count;
}

/** Debates left today; Infinity for premium / BYO-key. */
export function debatesRemaining(): number {
  if (isUnlimited()) return Infinity;
  rollIfNeeded();
  return Math.max(0, FREE_DAILY_LIMIT - cache.count);
}

/** Whether the user may start another debate right now. */
export function canStartDebate(): boolean {
  return debatesRemaining() > 0;
}

/** Count a debate against today's allowance. No-op for unlimited users. */
export async function recordDebate(): Promise<void> {
  if (isUnlimited()) return;
  rollIfNeeded();
  cache.count += 1;
  await persist();
}
