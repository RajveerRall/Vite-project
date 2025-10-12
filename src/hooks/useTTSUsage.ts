import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useTTSUsage() {
  const { isAuthenticated, user } = useAuth();
  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setUsedSeconds(0);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tts_quota_monthly')
        .select('used_seconds, month_start')
        .eq('user_id', user.id)
        .order('month_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setUsedSeconds(data?.used_seconds ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch usage');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { seconds?: number } | undefined;
      const seconds = detail?.seconds;
      if (typeof seconds === 'number' && seconds > 0) {
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
    totalMinutes: 1000,
    loading,
    error,
    refresh,
  };
}
