export interface FullCastOptions {
  llm?: string;
  parser?: 'simple' | 'intelligent' | 'singleNarrator' | 'chatThread';
  useVoiceCasting?: boolean;
  sessionId?: string;
  apiKey?: string;
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
    const { getUserSafely } = await import('../lib/authToken');
    const { user } = await getUserSafely(5000);
    userId = user?.id;
    userEmail = user?.email as string | undefined;
  } catch (error) {
    console.error('[fullCastTTS] Failed to get user for chat-thread request:', error);
    // Continue with undefined userId - request will work without auth
  }

  // Use chat-thread endpoint if parser is chatThread
  if (options.parser === 'chatThread') {
    const sessionId = options.sessionId || getOrCreateSessionId();
    const response = await fetch(`${baseURL}/api/chat-thread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(userEmail ? { 'X-User-Email': userEmail } : {}),
        ...(options.apiKey ? { 'X-Gemini-API-Key': options.apiKey } : {}),
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
      try { detail = await response.text(); } catch { }
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
      ...(options.apiKey ? { 'X-Gemini-API-Key': options.apiKey } : {}),
    },
    body: JSON.stringify({ text, ...options })
  });
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { }
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
    const { getUserSafely } = await import('../lib/authToken');
    const { user } = await getUserSafely(5000);
    userId = user?.id;
    userEmail = user?.email as string | undefined;
  } catch (error) {
    console.error('[fullCastTTS] Failed to get user for TTS request:', error);
    // Continue with undefined userId - request will work without auth
  }
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
    try { detail = await response.text(); } catch { }
    throw new Error(`TTS request failed: ${response.status} ${detail}`.trim());
  }
  return await response.blob();
}

export async function summarizeChapter(
  text: string,
  chapterTitle?: string,
  llm?: string,
  apiKey?: string
): Promise<{ summary: string; chapterTitle: string | null }> {
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { getUserSafely } = await import('../lib/authToken');
    const { user } = await getUserSafely(5000);
    userId = user?.id;
    userEmail = user?.email as string | undefined;
  } catch (error) {
    console.error('[fullCastTTS] Failed to get user for summarize request:', error);
    // Continue with undefined userId - request will work without auth
  }

  const response = await fetch(`${baseURL}/api/summarize-chapter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...(userEmail ? { 'X-User-Email': userEmail } : {}),
      ...(llm?.includes('gemini') ? { 'X-Gemini-API-Key': apiKey } : {}), // Potential future-proofing if options had it
    },
    body: JSON.stringify({ text, chapterTitle, llm })
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errorData = await response.json();
      detail = errorData.error || response.statusText;
    } catch {
      try { detail = await response.text(); } catch { }
    }
    throw new Error(`Chapter summarization failed: ${response.status} ${detail}`.trim());
  }

  return await response.json();
}


