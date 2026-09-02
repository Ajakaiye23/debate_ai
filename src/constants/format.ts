import type { DebateFormat, Segment } from '@/types/debate';

/**
 * THE SEGMENT ENGINE — the core idea behind how a debate is structured.
 *
 * The problem: a quick 3-round match and a formal 2v2 debate look nothing alike.
 * Rounds repeat; a formal debate doesn't (opening → cross-ex → closing, each a
 * different kind of turn). My first version tracked "which round" and "whose
 * turn" as two separate counters, and every new format meant more if-statements
 * scattered through the debate screen.
 *
 * The fix: describe *any* debate as a flat, ordered list of segments — one entry
 * per turn, saying who speaks and what kind of turn it is. The debate screen
 * then does something very simple: walk the list from index 0 to the end. It
 * never needs to know which format it's running.
 *
 * That means adding a new format is just adding a new list here, and nothing in
 * the rest of the app has to change. It's also what made 2v2 possible without
 * rewriting the debate screen.
 *
 * The three formats this builds:
 *  - quick:      rounds × [player1, player2] — a simple back-and-forth.
 *  - formal 1v1: Opening (each) → Cross-examination → Closing. The cross-ex is a
 *                real exchange (P1 asks → P2 answers → P2 asks → P1 answers)
 *                rather than two separate speeches, so speakers alternate and
 *                you can follow who is challenging whom.
 *  - formal 2v2: indices are 0 = TeamA speaker1, 1 = TeamB speaker1,
 *                2 = TeamA speaker2, 3 = TeamB speaker2. First speakers open and
 *                cross-examine; second speakers give the constructive, run their
 *                own cross-ex, and deliver the closings.
 *
 * @param format      'quick' or 'formal'
 * @param rounds      how many rounds (only used by 'quick')
 * @param playerCount 2 for 1v1, 4 for 2v2 team debates
 * @returns the full running order of the debate, start to finish
 */
export function buildSegments(
  format: DebateFormat,
  rounds: number,
  playerCount: 2 | 4 = 2
): Segment[] {
  if (format === 'formal' && playerCount === 4) {
    return [
      { playerIndex: 0, label: 'Opening statement', round: 1 },
      { playerIndex: 1, label: 'Opening statement', round: 1 },
      { playerIndex: 0, label: 'Cross-examination — questioning', round: 2 },
      { playerIndex: 1, label: 'Cross-examination — responding', round: 2 },
      { playerIndex: 1, label: 'Cross-examination — questioning', round: 2 },
      { playerIndex: 0, label: 'Cross-examination — responding', round: 2 },
      { playerIndex: 2, label: 'Constructive argument', round: 3 },
      { playerIndex: 3, label: 'Constructive argument', round: 3 },
      { playerIndex: 2, label: 'Cross-examination — questioning', round: 4 },
      { playerIndex: 3, label: 'Cross-examination — responding', round: 4 },
      { playerIndex: 3, label: 'Cross-examination — questioning', round: 4 },
      { playerIndex: 2, label: 'Cross-examination — responding', round: 4 },
      { playerIndex: 2, label: 'Closing statement', round: 5 },
      { playerIndex: 3, label: 'Closing statement', round: 5 },
    ];
  }

  if (format === 'formal') {
    return [
      { playerIndex: 0, label: 'Opening statement', round: 1 },
      { playerIndex: 1, label: 'Opening statement', round: 1 },
      { playerIndex: 0, label: 'Cross-examination — questioning', round: 2 },
      { playerIndex: 1, label: 'Cross-examination — responding', round: 2 },
      { playerIndex: 1, label: 'Cross-examination — questioning', round: 2 },
      { playerIndex: 0, label: 'Cross-examination — responding', round: 2 },
      { playerIndex: 0, label: 'Closing statement', round: 3 },
      { playerIndex: 1, label: 'Closing statement', round: 3 },
    ];
  }

  const segments: Segment[] = [];
  for (let r = 1; r <= rounds; r++) {
    segments.push({ playerIndex: 0, label: `Round ${r}`, round: r });
    segments.push({ playerIndex: 1, label: `Round ${r}`, round: r });
  }
  return segments;
}
