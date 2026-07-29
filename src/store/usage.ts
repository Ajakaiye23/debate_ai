import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasUserAnthropicKey } from '@/store/settings';

// The app is free with no ads or purchases. A single generous daily fair-use cap
// is the only limit — pure abuse protection so one heavy user can't run up a huge
// bill on the owner's shared key. Users who paste their own Anthropic key run on
// their own account and are never counted or capped.

export const DAILY_LIMIT = 10;

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

/** A BYO-key user runs on their own account — never counted, never capped. */
function untracked(): boolean {
  return hasUserAnthropicKey();
}

/** True when the user runs on their own key (shown as "unlimited" in the UI). */
export function isUnlimited(): boolean {
  return untracked();
}

/** Debates used today. */
export function debatesUsedToday(): number {
  rollIfNeeded();
  return cache.count;
}

/** Debates left today; Infinity for BYO-key users. */
export function debatesRemaining(): number {
  if (untracked()) return Infinity;
  rollIfNeeded();
  return Math.max(0, DAILY_LIMIT - cache.count);
}

/** Whether the user may start another debate right now. */
export function canStartDebate(): boolean {
  return debatesRemaining() > 0;
}

/** Count a debate against today's allowance. No-op for BYO-key users. */
export async function recordDebate(): Promise<void> {
  if (untracked()) return;
  rollIfNeeded();
  cache.count += 1;
  await persist();
}
