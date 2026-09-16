import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  DebateSession,
  Player,
  Argument,
  DebateMode,
  DebateFormat,
  AIDifficulty,
  Segment,
} from '@/types/debate';
import {
  factCheckArgument,
  getAIArgument,
  getFinalVerdict,
  type VerdictResult,
} from '@/services/claude';
import { transcribeAudio } from '@/services/whisper';

export type DebatePhase =
  | 'idle'
  | 'transcribing'
  | 'judging'
  | 'speaking'
  | 'ai-thinking'
  | 'complete';

export interface DebateConfig {
  topic: string;
  mode: DebateMode;
  format: DebateFormat;
  players: Player[];
  teamNames?: [string, string]; // set for 2v2 formal debates
  rounds: number;
  turnDuration: number;
  prepSeconds?: number; // formal: silent prep time before the first opening
  difficulty?: AIDifficulty;
  segments: Segment[];
}

export function useDebateState(config: DebateConfig) {
  const [phase, setPhase] = useState<DebatePhase>('idle');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [args, setArgs] = useState<Argument[]>([]);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [lastSpoken, setLastSpoken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const argsRef = useRef<Argument[]>([]);
  argsRef.current = args;

  const totalSegments = config.segments.length;
  const segment = config.segments[Math.min(segmentIndex, totalSegments - 1)];
  const currentPlayer = config.players[segment.playerIndex];
  const round = segment.round;

  // Keep the judge prompt lean: the last two turns stay verbatim (they're what
  // the current speaker is responding to); older turns are truncated. Cuts
  // prompt size on long debates, which speeds up every judging call.
  const historyText = useMemo(
    () =>
      args
        .map((a, i) => {
          const full = i >= args.length - 2;
          const body =
            full || a.transcript.length <= 240
              ? a.transcript
              : `${a.transcript.slice(0, 240)}… (truncated)`;
          return `[${a.label}] ${a.playerName} (${a.playerId}): ${body}`;
        })
        .join('\n'),
    [args]
  );

  const scoreTranscript = useCallback(
    async (player: Player, transcript: string): Promise<string> => {
      setPhase('judging');
      const result = await factCheckArgument(
        config.topic,
        player.side,
        transcript,
        historyText,
        segment.label
      );
      const arg: Argument = {
        playerId: player.id,
        playerName: player.name,
        teamName: player.team !== undefined ? config.teamNames?.[player.team] : undefined,
        transcript,
        round: segment.round,
        label: segment.label,
        scores: {
          accuracy: result.accuracy,
          strength: result.strength,
          clarity: result.clarity,
        },
        rebuttal: result.rebuttal,
        fallacies: result.fallacies?.filter((f) => typeof f === 'string' && f.trim()) ?? [],
        factCheckNotes: result.factCheckNotes,
        spokenSummary: result.spokenSummary,
        winner: result.roundWinner,
      };
      setArgs((prev) => [...prev, arg]);
      setLastSpoken(result.spokenSummary);
      setPhase('speaking');
      return result.spokenSummary;
    },
    [config.topic, config.teamNames, historyText, segment.label, segment.round]
  );

  const submitHumanTurn = useCallback(
    async (audioUri: string): Promise<string | null> => {
      try {
        setError(null);
        setPhase('transcribing');
        const transcript = await transcribeAudio(audioUri);
        if (!transcript) {
          setError("Couldn't hear that — try again.");
          setPhase('idle');
          return null;
        }
        return await scoreTranscript(currentPlayer, transcript);
      } catch (e: any) {
        setError(e?.message ?? 'Something went wrong.');
        setPhase('idle');
        return null;
      }
    },
    [currentPlayer, scoreTranscript]
  );

  const submitTypedTurn = useCallback(
    async (typed: string): Promise<string | null> => {
      const clean = typed.trim();
      if (!clean) return null;
      try {
        setError(null);
        return await scoreTranscript(currentPlayer, clean);
      } catch (e: any) {
        setError(e?.message ?? 'Something went wrong.');
        setPhase('idle');
        return null;
      }
    },
    [currentPlayer, scoreTranscript]
  );

  const submitAITurn = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      setPhase('ai-thinking');
      const text = await getAIArgument(
        config.topic,
        currentPlayer.side,
        historyText,
        config.difficulty ?? 'medium'
      );
      return await scoreTranscript(currentPlayer, text);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
      setPhase('idle');
      return null;
    }
  }, [config.topic, config.difficulty, currentPlayer, historyText, scoreTranscript]);

  /** Advances to the next segment. Returns true if the debate is now complete. */
  const finishTurn = useCallback(async (): Promise<boolean> => {
    if (segmentIndex >= totalSegments - 1) {
      try {
        setPhase('judging');
        const v = await getFinalVerdict(config.topic, argsRef.current, config.teamNames);
        setVerdict(v);
        setPhase('complete');
      } catch (e: any) {
        setError(e?.message ?? 'Failed to get verdict.');
        setPhase('complete');
      }
      return true;
    }
    setSegmentIndex((i) => i + 1);
    setPhase('idle');
    return false;
  }, [segmentIndex, totalSegments, config.topic, config.teamNames]);

  const buildSession = useCallback((): DebateSession => {
    let winnerPlayer: Player | 'tie' = 'tie';
    let winnerLabel: string | undefined;
    if (verdict?.winner && verdict.winner !== 'tie') {
      if (config.teamNames) {
        // Team debate: the verdict names a team; represent it by its first member.
        const teamIdx = config.teamNames.findIndex((t) => t === verdict.winner);
        if (teamIdx !== -1) {
          winnerPlayer = config.players.find((p) => p.team === teamIdx) ?? 'tie';
          winnerLabel = config.teamNames[teamIdx];
        }
      } else {
        winnerPlayer = config.players.find((p) => p.name === verdict.winner) ?? 'tie';
        if (winnerPlayer !== 'tie') winnerLabel = winnerPlayer.name;
      }
    }
    return {
      id: `debate-${Date.now()}`,
      topic: config.topic,
      mode: config.mode,
      format: config.format,
      players: config.players,
      teamNames: config.teamNames,
      rounds: config.rounds,
      turnDuration: config.turnDuration,
      arguments: argsRef.current,
      verdict: verdict?.reason ?? '',
      winner: winnerPlayer,
      winnerLabel,
      coaching: verdict?.coaching,
      createdAt: Date.now(),
    };
  }, [verdict, config]);

  return {
    phase,
    round,
    segmentIndex,
    totalSegments,
    segmentLabel: segment.label,
    currentPlayer,
    args,
    verdict,
    lastSpoken,
    error,
    submitHumanTurn,
    submitTypedTurn,
    submitAITurn,
    finishTurn,
    buildSession,
  };
}
