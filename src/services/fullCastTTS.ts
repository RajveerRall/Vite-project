export interface FullCastOptions {
  llm?: string;
  parser?: 'simple' | 'intelligent' | 'singleNarrator' | 'chatThread';
  useVoiceCasting?: boolean;
  sessionId?: string;
}

export interface DialogueLine {
  character: string;
  dialogue: string;
  gender?: 'male' | 'female' | 'neutral';
}

function getOrCreateSessionId(): string {
  let id = localStorage.getItem('ttsSessionId');
  if (!id) {
    id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    localStorage.setItem('ttsSessionId', id);
  }
  return id;
}

export async function requestFullCast(text: string, options: FullCastOptions = {}) {
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
    userEmail = (data?.user as any)?.email as string | undefined;
  } catch {}

  // Use chat-thread endpoint if parser is chatThread
  if (options.parser === 'chatThread') {
    const sessionId = options.sessionId || getOrCreateSessionId();
    const response = await fetch(`${baseURL}/api/chat-thread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(userEmail ? { 'X-User-Email': userEmail } : {}),
      },
      body: JSON.stringify({ 
        sessionId, 
        text, 
        llm: options.llm,
        inputChunkId: `chunk-${Date.now()}`
      })
    });
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch {}
      throw new Error(`Chat-thread request failed: ${response.status} ${detail}`.trim());
    }
    const data = await response.json();
    return data as { script: DialogueLine[] };
  }

  // Use original endpoint for other parsers
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
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
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


