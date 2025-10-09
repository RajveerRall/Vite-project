export interface FullCastOptions {
  llm?: string;
  parser?: 'simple' | 'intelligent' | 'singleNarrator';
  useVoiceCasting?: boolean;
}

export interface DialogueLine {
  character: string;
  dialogue: string;
  gender?: 'male' | 'female' | 'neutral';
}

export async function requestFullCast(text: string, options: FullCastOptions = {}) {
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
  const response = await fetch(`${baseURL}/api/full-cast-tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...options })
  });
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch {}
    throw new Error(`Full cast request failed: ${response.status} ${detail}`.trim());
  }
  const data = await response.json();
  return data as { script: DialogueLine[] };
}

export async function ttsForLine(text: string, provider?: string, voiceId?: string): Promise<Blob> {
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
  const response = await fetch(`${baseURL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, text, voiceId })
  });
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch {}
    throw new Error(`TTS request failed: ${response.status} ${detail}`.trim());
  }
  return await response.blob();
}


