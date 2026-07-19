import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSettings, hasUserAnthropicKey } from '@/store/settings';

// Daily debate caps protect the owner's API key from being drained:
//  - Free tier:   FREE_DAILY_LIMIT/day on the owner's key.
//  - Premium:     PREMIUM_DAILY_LIMIT/day — high enough to feel unlimited, but a
//                 fair-use ceiling so a single whale can't run up a huge bill.
//  - Own API key: truly unlimited (runs on the user's account, not the owner's).

export const FREE_DAILY_LIMIT = 10;
export const PREMIUM_DAILY_LIMIT = 100;

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

/** Today's cap for this user. Infinity only for BYO-key users. */
export function dailyLimit(): number {
  if (untracked()) return Infinity;
  return getSettings().premium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
}

/** True when the user runs on their own key (shown as "unlimited" in the UI). */
export function isUnlimited(): boolean {
  return untracked();
}

/** Debates used today (counts against free + premium caps). */
export function debatesUsedToday(): number {
  rollIfNeeded();
  return cache.count;
}

/** Debates left today; Infinity for BYO-key users. */
export function debatesRemaining(): number {
  const limit = dailyLimit();
  if (limit === Infinity) return Infinity;
  rollIfNeeded();
  return Math.max(0, limit - cache.count);
}

/** Whether the user may start another debate right now. */
export function canStartDebate(): boolean {
  return debatesRemaining() > 0;
}

/** Count a debate against today's allowance. No-op only for BYO-key users. */
export async function recordDebate(): Promise<void> {
  if (untracked()) return;
  rollIfNeeded();
  cache.count += 1;
  await persist();
}
