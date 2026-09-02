import {
  FACT_CHECK_PROMPT,
  VERDICT_PROMPT,
  AI_DEBATER_PROMPT,
  PRACTICE_DRILL_PROMPT,
  PRACTICE_FEEDBACK_PROMPT,
} from '@/constants/prompts';
import { safeJsonParse } from '@/utils/json';
import { getSettings, resolveKey } from '@/store/settings';
import { PROXY_URL, usingProxy, proxyHeaders } from '@/services/proxy';
import type { Argument, AIDifficulty } from '@/types/debate';

// Everything runs on Haiku — fast and the cheapest capable model. Judging and
// verdicts are short structured-JSON tasks it handles well, keeping per-debate
// cost to a few cents.
const MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(prompt: string, maxTokens: number, model = MODEL): Promise<string> {
  const payload = JSON.stringify({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  // A user's own key always calls Anthropic directly on their account — even
  // when a proxy is configured — so their usage never touches the owner's key.
  const userKey = getSettings().anthropicKey.trim();

  let res: Response;
  if (userKey) {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': userKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: payload,
    });
  } else if (usingProxy()) {
    res = await fetch(`${PROXY_URL}/api/anthropic`, {
      method: 'POST',
      headers: proxyHeaders(),
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
  const text = await callClaude(VERDICT_PROMPT(topic, allArguments, teamNames), 2048);
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

// --- Practice drills -------------------------------------------------------
// Used by the practice screen to train one weak skill at a time.

export interface PracticeDrill {
  scenario: string;
  task: string;
  hint: string;
}

/** Asks the coach to invent one short exercise aimed at a single skill. */
export async function getPracticeDrill(
  skill: string,
  skillMeaning: string
): Promise<PracticeDrill> {
  const text = await callClaude(PRACTICE_DRILL_PROMPT(skill, skillMeaning), 512);
  return safeJsonParse<PracticeDrill>(text);
}

export interface PracticeFeedback {
  score: number;
  didWell: string;
  improve: string;
  rewrite: string;
}

/** Grades an attempt against the one skill it was meant to train. */
export async function scorePracticeAttempt(
  skill: string,
  skillMeaning: string,
  drill: PracticeDrill,
  attempt: string
): Promise<PracticeFeedback> {
  const text = await callClaude(
    PRACTICE_FEEDBACK_PROMPT(skill, skillMeaning, drill.scenario, drill.task, attempt),
    768
  );
  return safeJsonParse<PracticeFeedback>(text);
}
