import type { Argument, AIDifficulty } from '@/types/debate';

export const FACT_CHECK_PROMPT = (
  topic: string,
  side: string,
  transcript: string,
  history: string,
  segmentLabel = ''
) => `
You are an impartial AI debate judge. A debate is happening on the topic: "${topic}".
${segmentLabel ? `This argument is the "${segmentLabel}" segment — judge it in that context.` : ''}

Full debate so far:
${history || '(this is the first argument)'}

The current speaker is arguing "${side}" and just said:
"${transcript}"

Evaluate this argument and respond ONLY with valid JSON (no markdown, no code fences):
{
  "accuracy": <1-10>,
  "strength": <1-10>,
  "clarity": <1-10>,
  "rebuttal": <1-10 — how directly it engages and dismantles the opposing case; if there is no opposing argument yet, how well it preempts obvious objections>,
  "fallacies": [<named logical fallacies committed in this turn, e.g. "strawman", "ad hominem", "slippery slope" — empty array if none; only flag clear cases>],
  "factCheckNotes": "<1-2 sentences: flag any factual errors or confirm accuracy>",
  "spokenSummary": "<2-3 sentences max, conversational, to be read aloud by TTS — give the scores and a brief note on the argument>",
  "roundWinner": <true if this player won this exchange, false if not>
}
`;

export const VERDICT_PROMPT = (
  topic: string,
  allArguments: Argument[],
  teamNames?: [string, string]
) => `
You are an impartial AI debate judge. The debate topic was: "${topic}".
${teamNames ? `This was a team debate: "${teamNames[0]}" vs "${teamNames[1]}". Judge the teams as units — every speaker's arguments count toward their team.` : ''}

Here is the full debate transcript with scores:
${JSON.stringify(
  allArguments.map((a) => ({
    player: a.playerName,
    ...(a.teamName ? { team: a.teamName } : {}),
    round: a.round,
    transcript: a.transcript.length > 600 ? `${a.transcript.slice(0, 600)}…` : a.transcript,
    scores: a.scores,
    factCheckNotes: a.factCheckNotes,
  })),
  null,
  2
)}

Give a final verdict. Respond ONLY with valid JSON (no markdown, no code fences):
{
  "winner": "<${teamNames ? `team name (exactly "${teamNames[0]}" or "${teamNames[1]}")` : 'player name'} or 'tie'>",
  "reason": "<2-3 sentences explaining why this ${teamNames ? 'team' : 'player'} won overall>",
  "spokenVerdict": "<A dramatic 3-4 sentence spoken verdict to be read aloud — announce the winner, give the key reason, compliment both ${teamNames ? 'teams' : 'debaters'}>",
  "coaching": [
    <one object per player who spoke: { "player": "<name>", "strongest": "<their single best moment, 1 sentence>", "tip": "<one concrete, specific improvement for next time, 1-2 sentences>" }>
  ]
}
`;

export const AI_DEBATER_PROMPT = (
  topic: string,
  side: string,
  history: string,
  difficulty: AIDifficulty
) => `
You are debating "${side}" on the topic: "${topic}".

Difficulty: ${difficulty}
- easy: make a reasonable but slightly weak argument, avoid aggressive tactics
- medium: make a solid evidence-based argument
- hard: make a sharp, aggressive argument, actively dismantle previous points

Full debate so far:
${history || '(you are opening the debate)'}

Respond with ONLY your spoken argument in plain text. 30-60 seconds when read aloud.
No JSON. No labels. Just the argument as if you are speaking.
`;
