import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useTTSUsageRecorder() {
  const { user } = useAuth();

  useEffect(() => {
    const onUpdated = async (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as { 
          seconds?: number; 
          source?: string; 
          isAnonymous?: boolean;
        } | undefined;
        const seconds = detail?.seconds;
        const source = detail?.source;
        const isAnonymous = detail?.isAnonymous;
        
        if (!seconds || seconds <= 0) return;
        if (source === 'reader') return; // Skip reader (already recorded in useReaderTTS)
        
        const { supabase } = await import('../lib/supabase');
        
        if (user?.id) {
          // ========================================
          // AUTHENTICATED USER - EXISTING LOGIC
          // ========================================
          await supabase.rpc('increment_tts_usage', {
            p_user_id: user.id,
            p_seconds: seconds,
            p_source: source || 'full-cast'
          });
        } else {
          // ========================================
          // ANONYMOUS USER - NEW LOGIC
          // ========================================
          const { getAnonymousSessionId } = await import('../utils/anonymousSession');
          const sessionId = getAnonymousSessionId();
          
          await supabase.rpc('record_anonymous_tts_usage', {
            p_session_id: sessionId,
            p_seconds: seconds,
            p_source: source || 'full-cast',
            p_user_agent: navigator.userAgent
          });
        }
      } catch (err) {
        console.warn('[TTS Usage Recorder] Failed to record usage:', err);
      }
    };
    window.addEventListener('tts-usage-updated', onUpdated as any);
    return () => window.removeEventListener('tts-usage-updated', onUpdated as any);
  }, [user?.id]);
}


