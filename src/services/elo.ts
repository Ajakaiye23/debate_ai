/**
 * ELO RATINGS — how online players get a skill number.
 *
 * ELO is the rating system used in chess. The idea: your rating goes up when you
 * win and down when you lose, but *how much* it moves depends on who you played.
 * Beating someone far better than you is a big jump; beating someone far worse
 * barely moves it. Over enough matches, everyone drifts toward a number that
 * reflects how they actually do.
 *
 * I used ELO instead of just counting wins because win-count rewards playing a
 * lot rather than playing well — someone with 50 wins against beginners would
 * outrank someone with 10 wins against strong debaters, which is backwards.
 */

/** Everyone starts here. 1000 is the conventional midpoint. */
export const START_ELO = 1000;

/**
 * The K-factor caps how far a single match can move a rating.
 * Higher K = ratings react faster but bounce around; lower K = slower and
 * steadier. 32 is the standard choice for a player base this small.
 */
const K = 32;

/**
 * The probability that `me` beats `opponent`, from their ratings alone.
 *
 * Returns a value between 0 and 1: 0.5 means an even match, 0.9 means `me` is
 * heavily favoured. The 400 is the ELO scale constant — a 400-point gap means
 * the stronger player is expected to win about 10 times out of 11.
 */
export function expectedScore(me: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - me) / 400));
}

/**
 * The new rating for `me` after a match.
 *
 * The whole system is this one line: compare what actually happened (1 for a
 * win, 0 for a loss) against what was expected. Win a match you were expected to
 * win and the difference is small, so your rating barely moves. Pull off an
 * upset and the difference is large, so you gain a lot — and your opponent, who
 * was expected to win, loses a lot.
 */
export function nextElo(me: number, opponent: number, won: boolean): number {
  const actualScore = won ? 1 : 0;
  return Math.round(me + K * (actualScore - expectedScore(me, opponent)));
}
