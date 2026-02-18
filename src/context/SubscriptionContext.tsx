/**
 * Subscription Context - Manages user subscription state and usage limits
 * Integrates with Supabase profiles table and DodoPayments
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../config/subscription-plans';
import { fetchSubscriptionInfo, fetchUsageLimit, SubscriptionInfo, UsageLimitInfo } from '../services/subscription/SubscriptionService';

interface SubscriptionContextType {
  // Subscription info
  subscriptionInfo: SubscriptionInfo | null;
  usageLimit: UsageLimitInfo | null;

  // Plans (hardcoded, no loading needed)
  plans: SubscriptionPlan[];

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  refreshSubscription: () => Promise<void>;
  refreshUsageLimit: () => Promise<void>;

  // Computed values
  isSubscribed: boolean;
  isLimitExceeded: boolean;
  minutesRemaining: number | null;
  subscriptionStatus: string | null;
  prepaidMinutes: number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [usageLimit, setUsageLimit] = useState<UsageLimitInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [usageLimitLoading, setUsageLimitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageLimitError, setUsageLimitError] = useState<string | null>(null);

  /**
   * Fetch subscription info using REST API (bypasses hanging RPC calls)
   */
  const refreshSubscription = useCallback(async () => {
    // In local/free mode, or if not authenticated, do not attempt to fetch
    if (!isAuthenticated || !user?.id || user.id.startsWith('guest-')) {
      // Set default "free mode" subscription info if needed, or just null
      setSubscriptionInfo({
        status: 'active',
        plan_id: 'pro_plan', // Mock as pro/free
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        cancel_at_period_end: false
      } as any);
      return;
    }

    // Prevent multiple overlapping refreshes
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      console.log('[Subscription] Fetching subscription info for user:', user.id);

      const data = await fetchSubscriptionInfo(user.id);

      console.log('[Subscription] Subscription info data received:', data);
      if (data) {
        setSubscriptionInfo(data);
      } else {
        console.warn('[Subscription] No subscription info data returned');
        setSubscriptionInfo(null);
      }
    } catch (e: any) {
      console.error('[Subscription] Failed to fetch subscription info:', e);
      setError(e?.message || 'Failed to fetch subscription info');
      setSubscriptionInfo(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  /**
   * Fetch usage limit info using REST API (bypasses hanging RPC calls)
   */
  const refreshUsageLimit = useCallback(async () => {
    // In local/free mode, or if not authenticated, do not attempt to fetch
    if (!isAuthenticated || !user?.id || user.id.startsWith('guest-')) {
      setUsageLimit({
        minutes_used: 0,
        minutes_limit: 9999,
        reset_date: new Date().toISOString()
      } as any);
      setUsageLimitLoading(false);
      return;
    }

    // Prevent multiple overlapping refreshes
    if (usageLimitLoading) return;

    try {
      setUsageLimitLoading(true);
      setUsageLimitError(null);
      console.log('[Subscription] Fetching usage limit for user:', user.id);

      const data = await fetchUsageLimit(user.id);

      console.log('[Subscription] Usage limit data received:', data);
      if (data) {
        setUsageLimit(data);
        setUsageLimitError(null);
      } else {
        console.warn('[Subscription] No usage limit data returned');
        setUsageLimit(null);
        setUsageLimitError('No usage limit data returned');
      }
    } catch (e: any) {
      console.error('[Subscription] Failed to fetch usage limit:', e);
      const errorMsg = e?.message || 'Failed to fetch usage limit';
      setUsageLimitError(errorMsg);
      setUsageLimit(null);
    } finally {
      setUsageLimitLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Initial load - fetch subscription info and usage limit on sign-in
  useEffect(() => {
    if (isAuthenticated && user?.id && !user.id.startsWith('guest-')) {
      refreshSubscription();
      refreshUsageLimit();
    } else {
      // Manually trigger the mock values for guest/unauth
      refreshSubscription();
      refreshUsageLimit();
    }
  }, [isAuthenticated, user?.id, refreshSubscription, refreshUsageLimit]);

  // Listen for usage updates
  useEffect(() => {
    const handleUsageUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && !detail.isAnonymous) {
        // Refresh both usage limit AND subscription info to keep them in sync
        setTimeout(() => {
          refreshUsageLimit();
          refreshSubscription();
        }, 500);
      }
    };

    window.addEventListener('tts-usage-updated', handleUsageUpdate);
    return () => window.removeEventListener('tts-usage-updated', handleUsageUpdate);
  }, [refreshUsageLimit, refreshSubscription]);

  // Computed values - OVERRIDDEN FOR FREE MODE
  const isSubscribed = true;
  const isLimitExceeded = false;
  // Calculate total remaining including prepaid (already included in minutes_remaining from DB, but ensure it's correct)
  const minutesRemaining = 9999;
  const prepaidMinutes = 9999;
  const subscriptionStatus = 'active';

  // Combined loading state (either subscription or usage limit loading)
  const combinedLoading = loading || usageLimitLoading;
  // Combined error state (show if either has error)
  const combinedError = error || usageLimitError;

  const value: SubscriptionContextType = {
    subscriptionInfo,
    usageLimit,
    plans: SUBSCRIPTION_PLANS, // Hardcoded plans, always available
    loading: combinedLoading,
    error: combinedError,
    refreshSubscription,
    refreshUsageLimit,
    isSubscribed,
    isLimitExceeded,
    minutesRemaining,
    subscriptionStatus,
    prepaidMinutes,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

