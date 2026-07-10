import type { DebateFormat, Segment } from '@/types/debate';

/**
 * Builds the ordered list of segments for a debate.
 * - quick:  rounds × [player1, player2]
 * - formal 1v1: Opening (each speaks) → Cross-examination (a real Q&A exchange:
 *           P1 questions → P2 responds → P2 questions → P1 responds, so the two
 *           voices alternate and you can tell who's speaking) → Closing.
 * - formal 2v2 (playerCount 4, indices 0=A1, 1=B1, 2=A2, 3=B2):
 *           first speakers open and cross-examine, second speakers give the
 *           constructive + their own cross-ex, and second speakers close.
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
