import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const FULL_CAST_MONTHLY_QUOTA_MINUTES = 300;

export function useFullCastUsage() {
  const { user } = useAuth();
  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { supabase } = await import('../lib/supabase');
      // Ensure we use the exact authenticated user id from Supabase
      const { data: me } = await supabase.auth.getUser();
      const userId = me?.user?.id || user?.id;
      if (!userId) {
        setUsedSeconds(0);
        return;
      }

      // Read per-source monthly bucket for full-cast ONLY
      const { data: bySource, error: bySourceErr } = await supabase
        .from('tts_quota_monthly_by_source')
        .select('used_seconds, month_start, source')
        .eq('user_id', userId)
        .eq('source', 'full-cast')
        .order('month_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bySourceErr) throw bySourceErr;
      setUsedSeconds(bySource?.used_seconds ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch full-cast usage');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { seconds?: number; source?: string } | undefined;
      const seconds = detail?.seconds;
      const source = detail?.source;
      // Count only full-cast events or events with no explicit source (from Reader full-cast path)
      if (typeof seconds === 'number' && seconds > 0 && (!source || source === 'full-cast')) {
        setUsedSeconds(prev => prev + seconds);
      } else {
        setTimeout(refresh, 300);
      }
    };
    window.addEventListener('tts-usage-updated', onUpdated as any);
    return () => window.removeEventListener('tts-usage-updated', onUpdated as any);
  }, [refresh]);

  return {
    usedSeconds,
    usedMinutes: Math.ceil(usedSeconds / 60),
    totalMinutes: FULL_CAST_MONTHLY_QUOTA_MINUTES,
    remainingMinutes: Math.max(0, FULL_CAST_MONTHLY_QUOTA_MINUTES - Math.ceil(usedSeconds / 60)),
    loading,
    error,
    refresh,
  };
}


