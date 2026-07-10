import type { DebateSession } from '@/types/debate';
import type { DebateConfig } from '@/hooks/useDebateState';

// Lightweight in-memory hand-off between screens. Avoids serializing
// complex objects through router params.

let pendingConfig: DebateConfig | null = null;
let lastSession: DebateSession | null = null;
let lastSpokenVerdict: string | null = null;

export const setPendingConfig = (c: DebateConfig) => {
  pendingConfig = c;
};
export const getPendingConfig = () => pendingConfig;

export const setLastSession = (s: DebateSession) => {
  lastSession = s;
};
export const getLastSession = () => lastSession;

/** The dramatic spoken verdict for TTS — only set for a just-finished debate. */
export const setLastSpokenVerdict = (text: string | null) => {
  lastSpokenVerdict = text;
};
export const getLastSpokenVerdict = () => lastSpokenVerdict;
