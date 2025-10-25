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
  wordTimings?: Array<{word: string; start: number; end: number}>;
  sentenceTimings?: Array<{sentence: string; start: number; end: number}>;
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
    console.log(`[Full Cast] Chat-thread completed, got ${data.script?.length || 0} script lines`);
    
    return { 
      script: data.script, 
      sessionId: data.sessionId || sessionId 
    };
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

export async function ttsForLine(text: string, provider?: string, voiceId?: string, options?: { includeSrt?: boolean; includeTiming?: boolean }): Promise<{ blob: Blob; srtContent?: string; wordTimings?: any[]; duration?: number }> {
  const baseURL = import.meta.env.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
    userEmail = (data?.user as any)?.email as string | undefined;
  } catch {}
  
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
    try { detail = await response.text(); } catch {}
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


