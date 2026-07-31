// Pooled sound-effect playback. Sounds are Kenney/Gemini-curated CC0 .m4a files
// in assets/sounds (converted from .ogg — iOS can't decode ogg). Each sound
// keeps a tiny pool of players so quick repeats don't cut each other off.
//
// Non-annoying safeguards: per-sound gain balancing, a short re-trigger cooldown,
// and subtle random pitch on the most-repeated ticks so they never feel robotic.

import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getSettings } from '@/store/settings';

const FILES = {
  // signature
  verdict: require('@/assets/sounds/verdict.m4a'), // gavel — verdict revealed
  winner: require('@/assets/sounds/winner.m4a'), // winner announced
  card: require('@/assets/sounds/card.m4a'), // score card appears
  fallacy: require('@/assets/sounds/fallacy.m4a'), // fallacy flagged
  // debate flow
  countdown: require('@/assets/sounds/countdown.m4a'), // 3-2-1 tick
  record_start: require('@/assets/sounds/record_start.m4a'), // recording begins
  submit: require('@/assets/sounds/submit.m4a'), // turn submitted
  mic_fail: require('@/assets/sounds/mic_fail.m4a'), // mic fail / retry
  // UI
  tap: require('@/assets/sounds/tap.m4a'), // button / mode-card tap
  select: require('@/assets/sounds/select.m4a'), // chip / toggle select
  back: require('@/assets/sounds/back.m4a'), // back / close
  start: require('@/assets/sounds/start.m4a'), // Start Debate CTA
} as const;

export type SoundName = keyof typeof FILES;

// gain: relative loudness; vary: subtle random pitch; minGap: ignore re-triggers
// within N ms so overlapping events don't stack into a harsh blip.
type Cfg = { gain?: number; vary?: boolean; minGap?: number };
const CFG: Record<SoundName, Cfg> = {
  verdict: { gain: 0.9 },
  winner: { gain: 0.75 },
  card: { gain: 0.7, minGap: 60 },
  fallacy: { gain: 0.6, vary: true, minGap: 60 },
  countdown: { gain: 0.5, vary: true, minGap: 120 },
  record_start: { gain: 0.6, minGap: 80 },
  submit: { gain: 0.7, minGap: 80 },
  mic_fail: { gain: 0.6, minGap: 200 },
  tap: { gain: 0.5, minGap: 30 },
  select: { gain: 0.5, minGap: 30 },
  back: { gain: 0.5, minGap: 40 },
  start: { gain: 0.8, minGap: 200 },
};

const POOL = 2;
const MASTER = 0.85;
const pool: Partial<Record<SoundName, AudioPlayer[]>> = {};
const lastPlayed: Partial<Record<SoundName, number>> = {};
let loaded = false;

/** Preload all players. Safe to call more than once. */
export async function loadSounds(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    // Mix under other audio; don't force silent-mode playback for SFX.
    await setAudioModeAsync({ playsInSilentMode: false });
  } catch {
    // best-effort
  }
  (Object.keys(FILES) as SoundName[]).forEach((name) => {
    const instances: AudioPlayer[] = [];
    for (let i = 0; i < POOL; i++) {
      try {
        instances.push(createAudioPlayer(FILES[name]));
      } catch {
        // skip if a player can't be created
      }
    }
    pool[name] = instances;
  });
}

/** Play a sound effect, unless sound effects are turned off in settings. */
export function playSound(name: SoundName): void {
  if (!getSettings().soundEffects) return;
  const instances = pool[name];
  if (!instances || instances.length === 0) return;

  const cfg = CFG[name] ?? {};
  const now = Date.now();
  if (cfg.minGap && now - (lastPlayed[name] ?? 0) < cfg.minGap) return;
  lastPlayed[name] = now;

  const free = instances.find((p) => !safePlaying(p)) ?? instances[0];
  try {
    free.volume = MASTER * (cfg.gain ?? 1);
    if (cfg.vary) {
      try {
        free.setPlaybackRate(0.94 + Math.random() * 0.12);
      } catch {
        // playback-rate control is best-effort
      }
    }
    free.seekTo(0);
    free.play();
  } catch {
    // ignore playback errors (player not ready yet)
  }
}

function safePlaying(p: AudioPlayer): boolean {
  try {
    return p.playing;
  } catch {
    return false;
  }
}
