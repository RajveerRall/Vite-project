import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useTTSUsageRecorder() {
  const { user } = useAuth();

  useEffect(() => {
    const onUpdated = async (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as { seconds?: number; source?: string } | undefined;
        const seconds = detail?.seconds;
        const source = detail?.source;
        if (!seconds || seconds <= 0) return;
        if (!user?.id) return; // only record for authenticated users
        // Events from the reader hook are already persisted; skip to avoid double counting
        if (source === 'reader') return;
        const { supabase } = await import('../lib/supabase');
        await supabase.rpc('increment_tts_usage', {
          p_user_id: user?.id ?? null,
          p_seconds: seconds,
          p_source: source || 'full-cast'
        });
      } catch (err) {
        console.warn('[TTS Usage Recorder] Failed to record usage:', err);
      }
    };
    window.addEventListener('tts-usage-updated', onUpdated as any);
    return () => window.removeEventListener('tts-usage-updated', onUpdated as any);
  }, [user?.id]);
}


