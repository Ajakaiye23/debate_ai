// Prebuilt ElevenLabs voices for the AI judge. These are standard "premade"
// voices available on every ElevenLabs account, so no fetching is needed.

export interface JudgeVoice {
  id: string;
  name: string;
  persona: string;
}

export const JUDGE_VOICES: JudgeVoice[] = [
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', persona: 'Authoritative news anchor' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', persona: 'Calm and measured' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', persona: 'Deep and commanding' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', persona: 'Warm and articulate' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', persona: 'Bright and energetic' },
];

// Falls back to the first voice if none is picked yet.
export const DEFAULT_VOICE_ID = JUDGE_VOICES[0].id;
