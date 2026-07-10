import { FACT_CHECK_PROMPT, VERDICT_PROMPT, AI_DEBATER_PROMPT } from '@/constants/prompts';
import { safeJsonParse } from '@/utils/json';
import { resolveKey } from '@/store/settings';
import { PROXY_URL, usingProxy } from '@/services/proxy';
import type { Argument, AIDifficulty } from '@/types/debate';

// Per-turn scoring runs on Haiku (fast + ~3x cheaper — it's called every turn);
// the final verdict + coaching stays on Sonnet where judgment quality shows most.
const TURN_MODEL = 'claude-haiku-4-5-20251001';
const VERDICT_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(prompt: string, maxTokens: number, model = TURN_MODEL): Promise<string> {
  const payload = JSON.stringify({
    model,
    max_tokens: maxTokens,
    // effort is only supported on Sonnet/Opus-tier models — Haiku rejects it.
    ...(model === VERDICT_MODEL ? { output_config: { effort: 'medium' } } : {}),
    messages: [{ role: 'user', content: prompt }],
  });

  let res: Response;
  if (usingProxy()) {
    res = await fetch(`${PROXY_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });
  } else {
    const key = resolveKey('anthropicKey', process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY);
    if (!key) throw new Error('Anthropic API key not set — add it in Settings.');
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // Allows direct calls from non-server (browser/RN) contexts.
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: payload,
    });
  }

  if (!res.ok) {
    const body = await res.text();
    let detail = '';
    try {
      detail = JSON.parse(body)?.error?.message ?? '';
    } catch {
      // not JSON
    }
    if (res.status === 429) {
      throw new Error('Claude is rate-limited or out of credits. Check your Anthropic billing, then try again.');
    }
    if (res.status === 401) {
      throw new Error('Your Anthropic API key looks invalid — double-check it.');
    }
    throw new Error(`Claude request failed (${res.status}). ${detail}`.trim());
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const block = data.content?.[0];
  return block && block.type === 'text' ? (block.text ?? '') : '';
}

export interface FactCheckResult {
  accuracy: number;
  strength: number;
  clarity: number;
  rebuttal?: number;
  fallacies?: string[];
  factCheckNotes: string;
  spokenSummary: string;
  roundWinner: boolean;
}

export async function factCheckArgument(
  topic: string,
  side: string,
  transcript: string,
  history: string,
  segmentLabel = ''
): Promise<FactCheckResult> {
  const text = await callClaude(
    FACT_CHECK_PROMPT(topic, side, transcript, history, segmentLabel),
    1024
  );
  return safeJsonParse<FactCheckResult>(text);
}

export interface VerdictResult {
  winner: string;
  reason: string;
  spokenVerdict: string;
  coaching?: { player: string; strongest: string; tip: string }[];
}

export async function getFinalVerdict(
  topic: string,
  allArguments: Argument[],
  teamNames?: [string, string]
): Promise<VerdictResult> {
  // Coaching adds a paragraph per speaker (up to 4 in 2v2) — needs more room.
  const text = await callClaude(VERDICT_PROMPT(topic, allArguments, teamNames), 2048, VERDICT_MODEL);
  return safeJsonParse<VerdictResult>(text);
}

export async function getAIArgument(
  topic: string,
  side: string,
  history: string,
  difficulty: AIDifficulty
): Promise<string> {
  const text = await callClaude(AI_DEBATER_PROMPT(topic, side, history, difficulty), 512);
  return text.trim();
}
