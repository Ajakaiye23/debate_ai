/**
 * PROGRESS ANALYSIS — turning a pile of past debates into "what should I work on?"
 *
 * Every debate already scores each turn on four skills. On their own those are
 * just numbers that scroll past once and disappear. This file reads the saved
 * history and answers three questions the app cares about:
 *
 *   1. How good am I at each skill, on average?
 *   2. Am I getting better or worse at it?
 *   3. Which one is my weakest — the thing worth practising next?
 *
 * That last answer is what powers the "practise this weakness" loop: debate →
 * analyse → drill the weak skill → debate again → watch the number move.
 */

import type { DebateSession } from '@/types/debate';

/** The four things the judge scores every turn on. */
export type SkillKey = 'accuracy' | 'strength' | 'clarity' | 'rebuttal';

export const SKILL_LABELS: Record<SkillKey, string> = {
  accuracy: 'Accuracy',
  strength: 'Argument strength',
  clarity: 'Clarity',
  rebuttal: 'Rebuttal',
};

/** Plain-language explanation of each skill, shown on the dashboard. */
export const SKILL_BLURBS: Record<SkillKey, string> = {
  accuracy: 'Are your facts right, and do your claims hold up when checked?',
  strength: 'How convincing is the reasoning behind what you claim?',
  clarity: 'Can a listener follow your point the first time they hear it?',
  rebuttal: "Do you actually answer the other side, or talk past it?",
};

export interface SkillStat {
  skill: SkillKey;
  average: number; // 0–10 across every scored turn
  /** Positive = improving. Difference between recent and earlier averages. */
  trend: number;
  samples: number; // how many turns fed this number
}

export interface ProgressReport {
  totalDebates: number;
  totalTurns: number;
  skills: SkillStat[];
  /** The lowest-scoring skill — what the practice loop targets. Null until there's data. */
  weakest: SkillStat | null;
  /** Highest-scoring skill, so the dashboard can lead with something positive. */
  strongest: SkillStat | null;
  /** Most recent debates, newest first: for the little "recent form" strip. */
  recent: { topic: string; date: number; average: number }[];
}

/** Turns need at least this many samples before we call one a "weakness". */
const MIN_SAMPLES = 3;

/**
 * We only analyse the device owner's own turns, not the opponent's — otherwise
 * a strong opponent would drag "your" numbers around. Player 1 is the owner in
 * Solo vs AI, and the first speaker in Pass & Play.
 *
 * Online matches are the exception: both devices save the same match, but the
 * device that *joined* is seat 2, so the turns saved as 'player2' are theirs.
 * mp-debate records that on the session, and we read it here — otherwise the
 * guest's dashboard would grade them on their opponent's arguments.
 */
const DEFAULT_OWNER_ID = 'player1';

function ownerIdOf(session: DebateSession): string {
  return session.ownerPlayerId ?? DEFAULT_OWNER_ID;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Improving or declining? Split the turns into an older half and a newer half
 * and compare the averages. Positive means the recent half scored higher.
 * Needs a few turns on each side before the comparison means anything.
 */
function trendOf(chronological: number[]): number {
  if (chronological.length < 4) return 0;
  const mid = Math.floor(chronological.length / 2);
  const older = chronological.slice(0, mid);
  const newer = chronological.slice(mid);
  return mean(newer) - mean(older);
}

/**
 * The player's weakest skill in ONE debate — used by the results screen to offer
 * a drill for the thing they just struggled with, while it's still fresh.
 * Returns null if this debate has no scored turns of theirs.
 */
export function weakestSkillOf(session: DebateSession): SkillKey | null {
  const own = session.arguments.filter((a) => a.playerId === ownerIdOf(session));
  if (own.length === 0) return null;

  const averages: { skill: SkillKey; value: number }[] = [
    { skill: 'accuracy', value: mean(own.map((a) => a.scores.accuracy)) },
    { skill: 'strength', value: mean(own.map((a) => a.scores.strength)) },
    { skill: 'clarity', value: mean(own.map((a) => a.scores.clarity)) },
  ];

  // Rebuttal only counts if the judge actually scored it this debate.
  const rebuttals = own
    .map((a) => a.rebuttal)
    .filter((r): r is number => typeof r === 'number');
  if (rebuttals.length > 0) averages.push({ skill: 'rebuttal', value: mean(rebuttals) });

  averages.sort((a, b) => a.value - b.value);
  return averages[0].skill;
}

export function computeProgress(sessions: DebateSession[]): ProgressReport {
  // History is stored newest-first; skills improve over time, so reverse it to
  // read oldest → newest before looking at trends.
  const chronological = [...sessions].reverse();

  const byskill: Record<SkillKey, number[]> = {
    accuracy: [],
    strength: [],
    clarity: [],
    rebuttal: [],
  };
  let totalTurns = 0;

  for (const session of chronological) {
    const ownerId = ownerIdOf(session);
    for (const arg of session.arguments) {
      if (arg.playerId !== ownerId) continue;
      totalTurns += 1;
      byskill.accuracy.push(arg.scores.accuracy);
      byskill.strength.push(arg.scores.strength);
      byskill.clarity.push(arg.scores.clarity);
      // Rebuttal is optional — older debates saved before it existed skip it.
      if (typeof arg.rebuttal === 'number') byskill.rebuttal.push(arg.rebuttal);
    }
  }

  const skills: SkillStat[] = (Object.keys(byskill) as SkillKey[]).map((skill) => ({
    skill,
    average: mean(byskill[skill]),
    trend: trendOf(byskill[skill]),
    samples: byskill[skill].length,
  }));

  // Only skills with enough turns behind them can be called a weakness — one
  // bad turn shouldn't send someone off to drill the wrong thing.
  const ranked = skills.filter((s) => s.samples >= MIN_SAMPLES).sort((a, b) => a.average - b.average);

  const recent = sessions.slice(0, 5).map((session) => {
    const own = session.arguments.filter((a) => a.playerId === ownerIdOf(session));
    const perTurn = own.map((a) => mean([a.scores.accuracy, a.scores.strength, a.scores.clarity]));
    return { topic: session.topic, date: session.createdAt, average: mean(perTurn) };
  });

  return {
    totalDebates: sessions.length,
    totalTurns,
    skills,
    weakest: ranked[0] ?? null,
    strongest: ranked.length > 0 ? ranked[ranked.length - 1] : null,
    recent,
  };
}
