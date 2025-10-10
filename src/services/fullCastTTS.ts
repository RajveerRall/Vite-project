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
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://161.35.186.252:4001';
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
    userEmail = (data?.user as any)?.email as string | undefined;
  } catch {}
  const response = await fetch(`${baseURL}/api/full-cast-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...(userEmail ? { 'X-User-Email': userEmail } : {}),
    },
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
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://161.35.186.252:4001';
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
    userEmail = (data?.user as any)?.email as string | undefined;
  } catch {}
  const response = await fetch(`${baseURL}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...(userEmail ? { 'X-User-Email': userEmail } : {}),
    },
    body: JSON.stringify({ provider, text, voiceId })
  });
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch {}
    throw new Error(`TTS request failed: ${response.status} ${detail}`.trim());
  }
  return await response.blob();
}


