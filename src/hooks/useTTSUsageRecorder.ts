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
        
        if (!seconds || seconds <= 0) return;
        if (source === 'reader') return; // Skip reader (already recorded in useReaderTTS)
        
        // Use enhanced usage tracker with queue and retry
        const { getUsageTracker, initializeUsageTracking } = await import('../services/tts/index');
        
        // Ensure tracker is initialized
        let tracker = getUsageTracker();
        if (!tracker) {
          await initializeUsageTracking(user?.id);
          tracker = getUsageTracker();
        }
        
        if (!tracker) {
          console.warn('[TTS Usage Recorder] Tracker not available, falling back to direct call');
          // Fallback to direct call if tracker unavailable
          const { supabase } = await import('../lib/supabase');
          
          if (user?.id) {
            await supabase.rpc('increment_tts_usage', {
              p_user_id: user.id,
              p_seconds: seconds,
              p_source: source || 'full-cast'
            });
          } else {
            const { getAnonymousSessionId } = await import('../utils/anonymousSession');
            const sessionId = getAnonymousSessionId();
            
            await supabase.rpc('record_anonymous_tts_usage', {
              p_session_id: sessionId,
              p_seconds: seconds,
              p_source: source || 'full-cast',
              p_user_agent: navigator.userAgent
            });
          }
          return;
        }
        
        // Use enhanced tracker (handles queue, retry, circuit breaker)
        await tracker.recordUsageSeconds(seconds, source || 'full-cast', {
          onSuccess: () => {
            console.log('[TTS Usage Recorder] Recorded successfully via enhanced tracker');
          },
          onError: (error) => {
            console.warn('[TTS Usage Recorder] Failed to record usage:', error);
          }
        });
      } catch (err) {
        console.warn('[TTS Usage Recorder] Failed to record usage:', err);
      }
    };
    window.addEventListener('tts-usage-updated', onUpdated as any);
    return () => window.removeEventListener('tts-usage-updated', onUpdated as any);
  }, [user?.id]);
}


