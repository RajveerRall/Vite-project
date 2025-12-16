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
  provider?: string;
  voiceId?: string;
  srtContent?: string;
  wordTimings?: Array<{ word: string; start: number; end: number }>;
  sentenceTimings?: Array<{ sentence: string; start: number; end: number }>;
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
  console.log('[Full Cast] Starting requestFullCast...', {
    textLength: text.length,
    parser: options.parser,
    llm: options.llm
  });

  // Use portable config if available, otherwise fall back to env or default
  let baseURL = 'http://localhost:4001';
  try {
    const { portableConfig } = await import('../config/portable');
    baseURL = portableConfig.fullCastTtsUrl;
    console.log('[Full Cast] Using portable config URL:', baseURL);
  } catch (e) {
    baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
    console.log('[Full Cast] Using env/default URL:', baseURL, 'Error loading portable config:', e);
  }

  // Auth removed per user request
  const userId: string | undefined = undefined;
  const userEmail: string | undefined = undefined;
  /*
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
    userEmail = (data?.user as any)?.email as string | undefined;
    console.log('[Full Cast] User auth loaded:', { 
      userId: userId ? 'present' : 'none', 
      userEmail: userEmail ? 'present' : 'none' 
    });
  } catch (e) {
    console.log('[Full Cast] User auth skipped:', e);
  }
  */

  // Use /api/full-cast-tts endpoint if parser is singleNarrator
  if (options.parser === 'singleNarrator') {
    const url = `${baseURL}/api/full-cast-tts`;
    const payload = {
      text,
      llm: options.llm,
      parser: 'singleNarrator',
      useVoiceCasting: options.useVoiceCasting ?? false
    };

    console.log('[Full Cast] Making single narrator request to:', url);
    console.log('[Full Cast] Request payload:', {
      textLength: text.length,
      llm: options.llm,
      parser: 'singleNarrator',
      useVoiceCasting: payload.useVoiceCasting
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {}),
          ...(userEmail ? { 'X-User-Email': userEmail } : {}),
        },
        body: JSON.stringify(payload)
      });

      console.log('[Full Cast] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch { }
        console.error('[Full Cast] Response not OK:', { status: response.status, detail });
        throw new Error(`Single narrator request failed: ${response.status} ${detail}`.trim());
      }

      const data = await response.json();
      console.log(`[Full Cast] Single narrator completed, got ${data.script?.length || 0} script lines`);

      return {
        script: data.script,
        sessionId: undefined
      };
    } catch (error) {
      console.error('[Full Cast] Fetch error:', error);
      console.error('[Full Cast] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // Use chat-thread endpoint if parser is chatThread
  if (options.parser === 'chatThread') {
    const sessionId = options.sessionId || getOrCreateSessionId();
    const url = `${baseURL}/api/chat-thread`;
    const payload = {
      sessionId,
      text,
      llm: options.llm,
      inputChunkId: `chunk-${Date.now()}`
    };

    console.log('[Full Cast] Making chat-thread request to:', url);
    console.log('[Full Cast] Request payload:', {
      sessionId,
      textLength: text.length,
      llm: options.llm,
      inputChunkId: payload.inputChunkId
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {}),
          ...(userEmail ? { 'X-User-Email': userEmail } : {}),
        },
        body: JSON.stringify(payload)
      });

      console.log('[Full Cast] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch { }
        console.error('[Full Cast] Response not OK:', { status: response.status, detail });
        throw new Error(`Chat-thread request failed: ${response.status} ${detail}`.trim());
      }

      const data = await response.json();
      console.log(`[Full Cast] Chat-thread completed, got ${data.script?.length || 0} script lines`);

      return {
        script: data.script,
        sessionId: data.sessionId || sessionId
      };
    } catch (error) {
      console.error('[Full Cast] Fetch error:', error);
      console.error('[Full Cast] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
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
    try { detail = await response.text(); } catch { }
    throw new Error(`Full cast request failed: ${response.status} ${detail}`.trim());
  }
  const data = await response.json();
  return data as { script: DialogueLine[] };
}

export async function ttsForLine(text: string, provider?: string, voiceId?: string, options?: { includeSrt?: boolean; includeTiming?: boolean }): Promise<{ blob: Blob; srtContent?: string; wordTimings?: any[]; duration?: number }> {
  // Use portable config if available, otherwise fall back to env or default
  let baseURL = 'http://localhost:4001';
  try {
    const { portableConfig } = await import('../config/portable');
    baseURL = portableConfig.fullCastTtsUrl;
  } catch (e) {
    baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
  }
  // Auth removed per user request
  const userId: string | undefined = undefined;
  const userEmail: string | undefined = undefined;
  /*
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
    userEmail = (data?.user as any)?.email as string | undefined;
  } catch {}
  */

  console.log('[TTS] Making request to:', `${baseURL}/api/tts`);
  console.log('[TTS] Request body:', {
    provider,
    text: text.substring(0, 50) + '...',
    voiceId,
    includeTiming: options?.includeTiming ?? true,
    includeSrt: options?.includeSrt ?? true
  });

  const response = await fetch(`${baseURL}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...(userEmail ? { 'X-User-Email': userEmail } : {}),
    },
    body: JSON.stringify({
      provider,
      text,
      voiceId,
      includeTiming: options?.includeTiming ?? true,
      includeSrt: options?.includeSrt ?? true
    })
  });

  console.log('[TTS] Response status:', response.status);
  console.log('[TTS] Response headers available:', Array.from(response.headers.keys()));

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { }
    throw new Error(`TTS request failed: ${response.status} ${detail}`.trim());
  }

  // Extract headers BEFORE consuming the response body
  const srtContent = response.headers.get('X-SRT-Content');
  const wordTimingsHeader = response.headers.get('X-Word-Timings');
  const audioDurationHeader = response.headers.get('X-Audio-Duration');

  console.log('[TTS] Raw header values:', {
    duration: audioDurationHeader,
    srtContentBase64Length: srtContent?.length,
    wordTimingsLength: wordTimingsHeader?.length,
    srtContentPreview: srtContent ? srtContent.substring(0, 50) + '...' : 'none'
  });

  const blob = await response.blob();

  let wordTimings: any[] | undefined;
  if (wordTimingsHeader) {
    try {
      const decodedTimings = atob(wordTimingsHeader);
      wordTimings = JSON.parse(decodedTimings);
      console.log('[TTS] Parsed word timings:', wordTimings?.length || 0, 'entries');
    } catch (e) {
      console.warn('[TTS] Failed to parse word timings:', e);
    }
  }

  let duration: number | undefined;
  if (audioDurationHeader) {
    duration = parseFloat(audioDurationHeader);
    console.log('[TTS] Parsed duration:', duration, 'seconds');
  }

  // Decode SRT if present
  let decodedSrt: string | undefined;
  if (srtContent) {
    try {
      decodedSrt = decodeURIComponent(escape(atob(srtContent)));
      console.log('[TTS] Decoded SRT:', {
        length: decodedSrt.length,
        preview: decodedSrt.substring(0, 100) + '...'
      });
    } catch (err) {
      console.error('[TTS] Failed to decode SRT:', err);
    }
  } else {
    console.warn('[TTS] No SRT content in response headers');
  }

  console.log('[TTS] Final result:', {
    blobSize: blob.size,
    duration,
    srtLength: decodedSrt?.length,
    wordTimingsCount: wordTimings?.length
  });

  return {
    blob,
    srtContent: decodedSrt,
    wordTimings,
    duration
  };
}


