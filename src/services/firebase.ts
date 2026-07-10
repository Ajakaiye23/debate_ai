import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, update, get, onValue, off } from 'firebase/database';
import { buildSegments } from '@/constants/format';
import { START_ELO, nextElo } from '@/services/elo';
import type { Argument, Segment } from '@/types/debate';

// ---- app init (lazy; no-op until Firebase env vars are configured) ----
let app: FirebaseApp | null = null;

function db() {
  if (!app) {
    app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
            projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
            databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
          });
  }
  return getDatabase(app);
}

export function firebaseConfigured(): boolean {
  return !!process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
}

// ---- types ----
export interface MpPlayer {
  deviceId: string;
  name: string;
  side: 'for' | 'against';
  eloAtStart: number;
}

export interface Room {
  code: string;
  status: 'config' | 'active' | 'complete';
  host: string; // host deviceId
  topic: string;
  rounds: number;
  turnDuration: number;
  players: { player1: MpPlayer; player2?: MpPlayer };
  segments: Segment[];
  currentIndex: number;
  args: Argument[];
  verdict?: { winner: string; reason: string; spokenVerdict: string };
  winnerName?: string; // player name or 'tie'
}

export interface PlayerStats {
  name: string;
  elo: number;
  wins: number;
  losses: number;
}

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ---- player stats / ELO ----
export async function getPlayerStats(deviceId: string): Promise<PlayerStats | null> {
  const snap = await get(ref(db(), `players/${deviceId}`));
  return snap.exists() ? (snap.val() as PlayerStats) : null;
}

export async function getPlayerElo(deviceId: string): Promise<number> {
  const stats = await getPlayerStats(deviceId);
  return stats?.elo ?? START_ELO;
}

/** Update one player's rating after a result. Each client writes its own record. */
export async function recordResult(
  deviceId: string,
  name: string,
  won: boolean,
  opponentElo: number
): Promise<void> {
  const stats = (await getPlayerStats(deviceId)) ?? { name, elo: START_ELO, wins: 0, losses: 0 };
  const updated: PlayerStats = {
    name,
    elo: nextElo(stats.elo, opponentElo, won),
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
  };
  await set(ref(db(), `players/${deviceId}`), updated);
}

export async function getLeaderboard(limit = 50): Promise<(PlayerStats & { id: string })[]> {
  const snap = await get(ref(db(), 'players'));
  if (!snap.exists()) return [];
  const all = snap.val() as Record<string, PlayerStats>;
  return Object.entries(all)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
}

// ---- room lifecycle ----
export async function createRoom(host: { deviceId: string; name: string }): Promise<string> {
  const code = makeRoomCode();
  const eloAtStart = await getPlayerElo(host.deviceId);
  const room: Room = {
    code,
    status: 'config',
    host: host.deviceId,
    topic: '',
    rounds: 3,
    turnDuration: 30,
    players: {
      player1: { deviceId: host.deviceId, name: host.name, side: 'for', eloAtStart },
    },
    segments: [],
    currentIndex: 0,
    args: [],
  };
  await set(ref(db(), `rooms/${code}`), room);
  return code;
}

export async function joinRoom(
  code: string,
  guest: { deviceId: string; name: string }
): Promise<Room | null> {
  const snap = await get(ref(db(), `rooms/${code}`));
  if (!snap.exists()) return null;
  const room = snap.val() as Room;
  if (room.status !== 'config' || room.players.player2) return null;
  const eloAtStart = await getPlayerElo(guest.deviceId);
  const player2: MpPlayer = {
    deviceId: guest.deviceId,
    name: guest.name,
    side: 'against',
    eloAtStart,
  };
  await update(ref(db(), `rooms/${code}`), { 'players/player2': player2 });
  return { ...room, players: { ...room.players, player2 } };
}

/** Host starts the debate once a guest has joined and config is set. */
export async function startRoom(
  code: string,
  config: { topic: string; rounds: number; turnDuration: number; hostSide: 'for' | 'against' }
): Promise<void> {
  const segments = buildSegments('quick', config.rounds);
  const guestSide: 'for' | 'against' = config.hostSide === 'for' ? 'against' : 'for';
  await update(ref(db(), `rooms/${code}`), {
    topic: config.topic,
    rounds: config.rounds,
    turnDuration: config.turnDuration,
    'players/player1/side': config.hostSide,
    'players/player2/side': guestSide,
    segments,
    currentIndex: 0,
    args: [],
    status: 'active',
  });
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): () => void {
  const r = ref(db(), `rooms/${code}`);
  onValue(r, (snap) => cb(snap.exists() ? (snap.val() as Room) : null));
  return () => off(r);
}

/** Active player appends their scored argument and advances the turn. */
export async function submitTurn(
  code: string,
  args: Argument[],
  nextIndex: number
): Promise<void> {
  await update(ref(db(), `rooms/${code}`), { args, currentIndex: nextIndex });
}

export async function finishRoom(
  code: string,
  verdict: { winner: string; reason: string; spokenVerdict: string },
  winnerName: string
): Promise<void> {
  await update(ref(db(), `rooms/${code}`), { verdict, winnerName, status: 'complete' });
}

export async function leaveRoom(code: string): Promise<void> {
  // Best-effort cleanup; ignore failures (other player may already be gone).
  try {
    await set(ref(db(), `rooms/${code}`), null);
  } catch {
    // ignore
  }
}
