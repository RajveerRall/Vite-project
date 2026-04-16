import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUsageLimit } from '../services/subscription/SubscriptionService';

export function useTTSUsage() {
  const { isAuthenticated, user } = useAuth();
  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [totalMinutes, setTotalMinutes] = useState<number>(0); // Now fetched from profiles
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setUsedSeconds(0);
      setTotalMinutes(0);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      // Fetch usage limit info using REST API (bypasses hanging RPC calls)
      const limitData = await fetchUsageLimit(user.id);

      if (!limitData) {
        console.warn('[useTTSUsage] No usage limit data returned, using defaults');
        setUsedSeconds(0);
        setTotalMinutes(1000); // Default fallback
      } else {
        // Use data from subscription system
        const minutesUsed = (limitData.minutes_used || 0);
        const minutesLimit = (limitData.minutes_limit || 0);
        
        setUsedSeconds(minutesUsed * 60);
        
        // If limit is 0, treat as unlimited (or default to 1000 for display)
        setTotalMinutes(minutesLimit > 0 ? minutesLimit : 1000);
      }
    } catch (e: any) {
      console.error('[useTTSUsage] Failed to fetch usage:', e);
      setError(e?.message || 'Failed to fetch usage');
      // Set defaults on error to prevent infinite loading
      setUsedSeconds(0);
      setTotalMinutes(1000);
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
        // Refresh to get updated limits
        setTimeout(refresh, 500);
      }
    };
    window.addEventListener('tts-usage-updated', onUpdated as any);
    return () => window.removeEventListener('tts-usage-updated', onUpdated as any);
  }, [refresh]);

  return {
    usedSeconds,
    usedMinutes: Math.ceil(usedSeconds / 60),
    totalMinutes,
    loading,
    error,
    refresh,
  };
}
