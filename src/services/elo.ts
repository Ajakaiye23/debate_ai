// Standard ELO rating math.

export const START_ELO = 1000;
const K = 32;

export function expectedScore(me: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - me) / 400));
}

/** New rating for `me` after a result vs `opponent` (won = true/false). */
export function nextElo(me: number, opponent: number, won: boolean): number {
  const score = won ? 1 : 0;
  return Math.round(me + K * (score - expectedScore(me, opponent)));
}
