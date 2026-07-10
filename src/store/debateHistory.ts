import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DebateSession } from '@/types/debate';

const KEY = 'debateai:history';

export async function loadDebates(): Promise<DebateSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DebateSession[]) : [];
  } catch {
    return [];
  }
}

export async function saveDebate(session: DebateSession): Promise<void> {
  const all = await loadDebates();
  // Newest first; de-dupe by id so a re-render doesn't double-save.
  const next = [session, ...all.filter((d) => d.id !== session.id)];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearDebates(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
