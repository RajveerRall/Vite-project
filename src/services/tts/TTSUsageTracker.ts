/**
 * Service for tracking TTS usage
 * Handles both authenticated and anonymous user usage tracking
 */

import { useAuth } from '../../context/AuthContext';

export interface UsageTrackingCallbacks {
  onSuccess?: (seconds: number, isAnonymous: boolean) => void;
  onError?: (error: Error) => void;
}

export class TTSUsageTracker {
  private userId: string | undefined;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Record usage seconds for TTS playback
   */
  async recordUsageSeconds(
    seconds: number,
    source: string = 'reader',
    callbacks?: UsageTrackingCallbacks
  ): Promise<void> {
    if (!seconds || seconds <= 0) return;

    try {
      const { supabase } = await import('../../lib/supabase');
      const { getAnonymousSessionId } = await import('../../utils/anonymousSession');

      if (this.userId) {
        // Authenticated user
        await supabase.rpc('increment_tts_usage', {
          p_user_id: this.userId,
          p_seconds: seconds,
          p_source: source,
        });

        console.log('[TTS Usage] Recorded for authenticated user:', {
          userId: this.userId,
          seconds,
          source,
        });

        callbacks?.onSuccess?.(seconds, false);
      } else {
        // Anonymous user
        const sessionId = getAnonymousSessionId();
        const userAgent = navigator.userAgent;

        const { data, error } = await supabase.rpc('record_anonymous_tts_usage', {
          p_session_id: sessionId,
          p_seconds: seconds,
          p_source: source,
          p_user_agent: userAgent,
        });

        if (error) throw error;

        console.log('[TTS Usage] Recorded for anonymous user:', {
          sessionId,
          seconds,
          source,
          totalThisMonth: data?.total_minutes_this_month,
        });

        callbacks?.onSuccess?.(seconds, true);
      }

      // Notify UI components
      window.dispatchEvent(
        new CustomEvent('tts-usage-updated', {
          detail: {
            seconds,
            source,
            isAnonymous: !this.userId,
          },
        })
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn('[TTS Usage] Failed to record usage:', err);
      callbacks?.onError?.(err);
      throw err;
    }
  }

  /**
   * Update user ID (useful when user logs in)
   */
  updateUserId(userId: string | undefined): void {
    this.userId = userId;
  }
}

/**
 * Factory function to create usage tracker with current auth state
 */
export function createTTSUsageTracker(userId?: string): TTSUsageTracker {
  return new TTSUsageTracker(userId);
}

