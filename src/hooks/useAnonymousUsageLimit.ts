import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAnonymousSessionId } from '../utils/anonymousSession';

const ANONYMOUS_MONTHLY_LIMIT_MINUTES = 10;
const WARNING_THRESHOLD_80 = ANONYMOUS_MONTHLY_LIMIT_MINUTES * 0.8; // 8 minutes
const WARNING_THRESHOLD_90 = ANONYMOUS_MONTHLY_LIMIT_MINUTES * 0.9; // 9 minutes

export interface AnonymousUsageLimit {
  // Usage data
  usedMinutes: number;
  usedSeconds: number;
  limitMinutes: number;
  limitSeconds: number;
  remainingMinutes: number;
  remainingSeconds: number;
  
  // Status
  isLimitReached: boolean;
  isNearLimit: boolean; // 80%+
  isCritical: boolean;  // 90%+
  percentageUsed: number;
  
  // Actions
  checkLimit: () => Promise<boolean>; // Returns true if under limit
  refreshUsage: () => Promise<void>;
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
}

export function useAnonymousUsageLimit(): AnonymousUsageLimit | null {
  const { user } = useAuth();
  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [limitSeconds, setLimitSeconds] = useState<number>(ANONYMOUS_MONTHLY_LIMIT_MINUTES * 60);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);
  const usedMinutes = Math.floor(usedSeconds / 60);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const limitMinutes = Math.floor(limitSeconds / 60);
  const percentageUsed = limitSeconds > 0 ? (usedSeconds / limitSeconds) * 100 : 0;
  
  const isLimitReached = usedSeconds >= limitSeconds;
  const warningThreshold80 = limitMinutes * 0.8;
  const warningThreshold90 = limitMinutes * 0.9;
  const isNearLimit = usedMinutes >= warningThreshold80;
  const isCritical = usedMinutes >= warningThreshold90;
  
  // Fetch current usage from Supabase
  const refreshUsage = useCallback(async () => {
    if (user?.id) {
      // Authenticated users don't have this limit
      setIsLoading(false);
      return;
    }
    
    try {
      const { supabase } = await import('../lib/supabase');
      const sessionId = getAnonymousSessionId();
      
      // Add timeout protection to prevent hanging (5 seconds)
      const rpcPromise = supabase.rpc('get_anonymous_usage', {
        p_session_id: sessionId
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Anonymous usage RPC timeout after 5 seconds')), 5000);
      });
      
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
      
      if (error) throw error;
      
      const totalSeconds = data?.total_seconds || 0;
      // Use effective limit from RPC (includes bonus minutes)
      const effectiveLimitSeconds = data?.limit_seconds || (ANONYMOUS_MONTHLY_LIMIT_MINUTES * 60);
      const remainingSecondsFromRPC = data?.remaining_seconds || Math.max(0, effectiveLimitSeconds - totalSeconds);
      
      setUsedSeconds(totalSeconds);
      setLimitSeconds(effectiveLimitSeconds);
      
      console.log('[AnonymousUsageLimit] Current usage:', {
        usedMinutes: Math.floor(totalSeconds / 60),
        limitMinutes: Math.floor(effectiveLimitSeconds / 60),
        remainingMinutes: Math.floor(remainingSecondsFromRPC / 60),
        percentageUsed: ((totalSeconds / effectiveLimitSeconds) * 100).toFixed(1) + '%',
        hasBonus: data?.has_bonus || false,
        bonusMinutes: data?.bonus_minutes || 0
      });
    } catch (err: any) {
      // Handle timeout gracefully - don't block TTS if usage check fails
      if (err?.message?.includes('timeout')) {
        console.warn('[AnonymousUsageLimit] Usage check timeout, allowing TTS to proceed');
        // Don't set usedSeconds, keep current state
      } else {
        console.error('[AnonymousUsageLimit] Failed to fetch usage:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);
  
  // Check if user can use TTS (under limit)
  const checkLimit = useCallback(async (): Promise<boolean> => {
    if (user?.id) {
      // Authenticated users have no limit (or different limits)
      return true;
    }
    
    await refreshUsage();
    
    if (isLimitReached) {
      console.warn('[AnonymousUsageLimit] Limit reached, blocking TTS');
      setShowLimitModal(true);
      return false;
    }
    
    return true;
  }, [user?.id, isLimitReached, refreshUsage]);
  
  // Initial load
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);
  
  // Listen to usage updates
  useEffect(() => {
    const handleUsageUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.isAnonymous) {
        // Refresh usage after anonymous TTS usage
        refreshUsage();
      }
    };
    
    window.addEventListener('tts-usage-updated', handleUsageUpdate);
    return () => window.removeEventListener('tts-usage-updated', handleUsageUpdate);
  }, [refreshUsage]);
  
  // Don't return anything for authenticated users
  if (user?.id) {
    return null;
  }
  
  // Return null while loading to avoid flashing
  if (isLoading) {
    return null;
  }
  
  return {
    usedMinutes,
    usedSeconds,
    limitMinutes,
    limitSeconds,
    remainingMinutes,
    remainingSeconds,
    isLimitReached,
    isNearLimit,
    isCritical,
    percentageUsed,
    checkLimit,
    refreshUsage,
    showLimitModal,
    setShowLimitModal
  };
}

