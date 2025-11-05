import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const FULL_CAST_MONTHLY_QUOTA_MINUTES = 300;

// Feature flag - should match the one in header.tsx
// Set to true to enable Full Cast feature and auth calls
const FULL_CAST_ENABLED = false;

export function useFullCastUsage() {
  const { user } = useAuth();
  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Early return if feature is disabled - don't make any auth calls
    if (!FULL_CAST_ENABLED) {
      setUsedSeconds(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use AuthContext user first (more reliable, no async call)
      let userId = user?.id;
      
      // Only call getUser if we don't have userId from context
      if (!userId) {
        try {
          const { getUserSafely } = await import('../lib/authToken');
          const { user: authUser } = await getUserSafely(5000);
          userId = authUser?.id;
        } catch (error) {
          console.error('[useFullCastUsage] Failed to get user:', error);
          setUsedSeconds(0);
          return;
        }
      }
      
      if (!userId) {
        setUsedSeconds(0);
        return;
      }

      // Read per-source monthly bucket for full-cast ONLY
      const { supabase } = await import('../lib/supabase');
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

  // Only run refresh if feature is enabled
  useEffect(() => {
    if (FULL_CAST_ENABLED) {
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    // Only listen for events if feature is enabled
    if (!FULL_CAST_ENABLED) return;
    
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


