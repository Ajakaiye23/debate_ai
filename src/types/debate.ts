export type DebateMode = 'pass-and-play' | 'solo-vs-ai' | 'multiplayer';
export type DebateFormat = 'quick' | 'formal';
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: string; // 'player1' | 'player2' | 'ai' | 'player3' | 'player4'
  name: string;
  side: 'for' | 'against';
  voiceId?: string; // ElevenLabs voice for reading this player's verdicts (formal mode)
  team?: 0 | 1; // team index for 2v2 formal debates
  isAI?: boolean; // this speaker's turns are argued by Claude
}

/** One step of a debate: which player speaks, and what kind of segment it is. */
export interface Segment {
  playerIndex: number;
  label: string; // e.g. "Round 1" or "Opening statement"
  round: number;
}

export interface Scores {
  accuracy: number; // 1–10
  strength: number; // 1–10
  clarity: number; // 1–10
}

export interface Argument {
  playerId: string;
  playerName: string;
  teamName?: string; // set in 2v2 formal debates
  transcript: string;
  round: number;
  label: string; // segment label (e.g. "Opening statement")
  scores: Scores;
  rebuttal?: number; // 1–10, how well the turn engaged the opposing case
  fallacies?: string[]; // named logical fallacies spotted in this turn
  factCheckNotes: string;
  spokenSummary: string;
  winner: boolean;
}

export interface CoachingTip {
  player: string;
  strongest: string; // their best moment in the debate
  tip: string; // one concrete improvement
}

export interface DebateSession {
  id: string;
  topic: string; // User typed — never preset
  mode: DebateMode;
  format: DebateFormat;
  players: Player[];
  teamNames?: [string, string]; // set for 2v2 formal debates
  rounds: number; // Customizable, default 3
  turnDuration: number; // Seconds per turn, customizable
  arguments: Argument[];
  verdict: string;
  winner: Player | 'tie';
  winnerLabel?: string; // display name for the winner (team name in 2v2)
  coaching?: CoachingTip[]; // per-player feedback from the judge
  createdAt: number;
}
