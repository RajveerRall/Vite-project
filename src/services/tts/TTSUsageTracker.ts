/**
 * Enhanced service for tracking TTS usage with retry, queue, circuit breaker, and idempotency
 * Handles both authenticated and anonymous user usage tracking
 */

import RetryStrategy from './RetryStrategy';
import CircuitBreaker from './CircuitBreaker';
import UsageTrackingQueue, { QueuedEvent } from './UsageTrackingQueue';
import UsageMetrics from './UsageMetrics';
import { UsageEvent, UsageEventValidation } from '../../types/tts';
import { isTrackingEnabled } from '../../utils/trackingConfig';

export interface UsageTrackingCallbacks {
  onSuccess?: (seconds: number, isAnonymous: boolean) => void;
  onError?: (error: Error) => void;
}

export class TTSUsageTracker {
  private userId: string | undefined;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private usageQueue: UsageTrackingQueue;
  private metrics: UsageMetrics;

  constructor(userId?: string) {
    this.userId = userId;
    this.retryStrategy = new RetryStrategy({
      maxRetries: 3,
      delayMs: 1000,
      factor: 2,
    });
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      breakerTimeoutMs: 60000,
    });
    this.usageQueue = new UsageTrackingQueue(5, 60000);
    this.metrics = new UsageMetrics();

    // Set up queue processing callback
    this.usageQueue.setProcessCallback(async (event: QueuedEvent) => {
      await this.processQueuedEvent(event);
    });

    // Periodically update metrics
    setInterval(() => {
      this.updateMetrics().catch(console.error);
    }, 30000);
  }

  /**
   * Validate usage event before tracking
   */
  private validateEvent(seconds: number, source: string): UsageEventValidation {
    const errors: string[] = [];

    if (!seconds || seconds <= 0) {
      errors.push('Seconds must be greater than 0');
    }

    if (!source || source.trim() === '') {
      errors.push('Source is required');
    }

    if (seconds > 3600) {
      errors.push('Seconds cannot exceed 3600 (1 hour) per event');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate checksum for idempotency
   */
  private generateChecksum(event: UsageEvent): string {
    const data = `${event.userId || event.sessionId}-${event.seconds}-${event.source}-${event.timestamp}`;
    // Simple hash function (can be replaced with crypto.subtle for production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Create usage event with idempotency
   */
  private createUsageEvent(
    seconds: number,
    source: string,
    sessionId?: string
  ): UsageEvent {
    const event: UsageEvent = {
      id: crypto.randomUUID(),
      userId: this.userId,
      sessionId,
      seconds,
      source,
      timestamp: Date.now(),
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    };

    event.checksum = this.generateChecksum(event);
    return event;
  }

  /**
   * Process a queued event
   */
  private async processQueuedEvent(event: QueuedEvent): Promise<void> {
    const { seconds, source, userId, sessionId } = event.payload;

    try {
      await this.trackUsageDirect(seconds, source, userId, sessionId);
      this.metrics.recordSuccess();
    } catch (error) {
      this.metrics.recordFailure();
      throw error;
    }
  }

  /**
   * Check usage limit before recording (for authenticated users)
   * Uses REST API instead of RPC to avoid hanging
   */
  private async checkUsageLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const { getAccessToken } = await import('../../lib/authToken');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[TTS Usage] Missing Supabase env vars, allowing usage');
        return { allowed: true };
      }
      
      const accessToken = await getAccessToken(5000);
      const url = `${supabaseUrl}/rest/v1/rpc/check_tts_usage_limit`;
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ p_user_id: userId }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Handle 401 - try to refresh token and retry
        if (response.status === 401) {
          console.log('[TTS Usage] Limit check token expired (401), attempting refresh...');
          try {
            const { supabase } = await import('../../lib/supabase');
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
            
            if (sessionError || !session?.access_token) {
              console.warn('[TTS Usage] Limit check refresh failed, allowing usage');
              return { allowed: true }; // Fail open
            }
            
            console.log('[TTS Usage] Limit check token refreshed, retrying...');
            
            // Retry with new token
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 5000);
            
            try {
              const retryResponse = await fetch(url, {
                method: 'POST',
                headers: {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation',
                },
                body: JSON.stringify({ p_user_id: userId }),
                signal: retryController.signal,
              });
              
              clearTimeout(retryTimeoutId);
              
              if (!retryResponse.ok) {
                console.warn('[TTS Usage] Limit check failed after refresh, allowing usage:', retryResponse.status);
                return { allowed: true }; // Fail open
              }
              
              const data = await retryResponse.json();
              
              if (data?.limit_exceeded) {
                return {
                  allowed: false,
                  reason: `Usage limit exceeded. ${data.minutes_used}/${data.minutes_limit} minutes used.`,
                };
              }
              
              return { allowed: true };
            } catch (retryError: any) {
              clearTimeout(retryTimeoutId);
              if (retryError.name !== 'AbortError') {
                console.warn('[TTS Usage] Limit check retry error, allowing usage:', retryError.message);
              }
              return { allowed: true }; // Fail open
            }
          } catch (refreshError: any) {
            console.warn('[TTS Usage] Limit check refresh error, allowing usage:', refreshError.message);
            return { allowed: true }; // Fail open
          }
        }
        
        if (!response.ok) {
          console.warn('[TTS Usage] Limit check failed, allowing usage:', response.status);
          return { allowed: true }; // Fail open
        }
        
        const data = await response.json();
        
        if (data?.limit_exceeded) {
          return {
            allowed: false,
            reason: `Usage limit exceeded. ${data.minutes_used}/${data.minutes_limit} minutes used.`,
          };
        }
        
        return { allowed: true };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name !== 'AbortError') {
          console.warn('[TTS Usage] Limit check error, allowing usage:', fetchError.message);
        }
        return { allowed: true }; // Fail open
      }
    } catch (error) {
      console.warn('[TTS Usage] Error checking limit, allowing usage:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Direct tracking (bypasses queue, used for immediate attempts)
   * Uses REST API instead of RPC to avoid hanging
   */
  private async trackUsageDirect(
    seconds: number,
    source: string,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const { getAccessToken } = await import('../../lib/authToken');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (userId) {
      // Check limit before recording (with REST API)
      const limitCheck = await this.checkUsageLimit(userId);
      if (!limitCheck.allowed) {
        const error = new Error(limitCheck.reason || 'Usage limit exceeded');
        (error as any).code = 'TTS_USAGE_LIMIT_EXCEEDED';
        throw error;
      }

      // Authenticated user - record usage via REST API
      const eventId = crypto.randomUUID();
      const url = `${supabaseUrl}/rest/v1/rpc/increment_tts_usage`;
      
      const accessToken = await getAccessToken(5000);
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            p_user_id: userId,
            p_seconds: seconds,
            p_source: source,
            p_event_id: eventId,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Handle 401 - try to refresh token and retry
        if (response.status === 401) {
          console.log('[TTS Usage] Token expired (401), attempting refresh...');
          try {
            const { supabase } = await import('../../lib/supabase');
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
            
            if (sessionError || !session?.access_token) {
              throw new Error('Failed to refresh session');
            }
            
            console.log('[TTS Usage] Token refreshed, retrying request...');
            
            // Retry with new token
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
            
            try {
              const retryResponse = await fetch(url, {
                method: 'POST',
                headers: {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                  p_user_id: userId,
                  p_seconds: seconds,
                  p_source: source,
                  p_event_id: eventId,
                }),
                signal: retryController.signal,
              });
              
              clearTimeout(retryTimeoutId);
              
              if (!retryResponse.ok) {
                const errorText = await retryResponse.text();
                console.error(`[TTS Usage] HTTP ${retryResponse.status} after refresh:`, errorText);
                
                if (errorText.includes('TTS_USAGE_LIMIT_EXCEEDED') || errorText.includes('limit exceeded')) {
                  const limitError = new Error(errorText);
                  (limitError as any).code = 'TTS_USAGE_LIMIT_EXCEEDED';
                  throw limitError;
                }
                throw new Error(`Failed to record usage after refresh: ${errorText}`);
              }
              
              // Success after refresh
              return;
            } catch (retryError: any) {
              clearTimeout(retryTimeoutId);
              if (retryError.name === 'AbortError') {
                throw new Error('Usage tracking request timeout after refresh');
              }
              throw retryError;
            }
          } catch (refreshError: any) {
            console.error('[TTS Usage] Token refresh failed:', refreshError);
            throw new Error('Session expired. Please sign in again.');
          }
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[TTS Usage] HTTP ${response.status}:`, errorText);
          
          // Check if it's a limit exceeded error
          if (errorText.includes('TTS_USAGE_LIMIT_EXCEEDED') || errorText.includes('limit exceeded')) {
            const limitError = new Error(errorText);
            (limitError as any).code = 'TTS_USAGE_LIMIT_EXCEEDED';
            throw limitError;
          }
          throw new Error(`Failed to record usage: ${errorText}`);
        }
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Usage tracking request timeout after 10 seconds');
        }
        throw fetchError;
      }
    } else if (sessionId) {
      // Anonymous user - use REST API
      const url = `${supabaseUrl}/rest/v1/rpc/record_anonymous_tts_usage`;
      
      const accessToken = await getAccessToken(5000);
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            p_session_id: sessionId,
            p_seconds: seconds,
            p_source: source,
            p_user_agent: navigator.userAgent,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to record usage for anonymous user: ${errorText}`);
        }
        
        return await response.json();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Anonymous usage tracking request timeout after 10 seconds');
        }
        throw fetchError;
      }
    } else {
      throw new Error('Either userId or sessionId must be provided');
    }
  }

  /**
   * Record usage seconds for TTS playback with enhanced error handling
   */
  async recordUsageSeconds(
    seconds: number,
    source: string = 'reader',
    callbacks?: UsageTrackingCallbacks
  ): Promise<void> {
    // TEMPORARILY DISABLED FOR TESTING - Remove this comment block to re-enable
    // Skip tracking if disabled in development
    // if (!isTrackingEnabled()) {
    //   console.log('[TTS Usage] Tracking disabled in development - skipping usage recording');
    //   return;
    // }

    // Validation
    const validation = this.validateEvent(seconds, source);
    if (!validation.valid) {
      const error = new Error(`Validation failed: ${validation.errors?.join(', ')}`);
      console.warn('[TTS Usage] Validation failed:', validation.errors);
      callbacks?.onError?.(error);
      throw error;
    }

    const { getAnonymousSessionId } = await import('../../utils/anonymousSession');
    const sessionId = this.userId ? undefined : getAnonymousSessionId();
    const usageEvent = this.createUsageEvent(seconds, source, sessionId);

    // Try immediate tracking with circuit breaker and retry
    try {
      await this.circuitBreaker.execute(async () => {
        await this.retryStrategy.execute(
          async () => {
            await this.trackUsageDirect(
              seconds,
              source,
              this.userId,
              sessionId
            );
          },
          (error, attempt) => {
            console.warn(`[TTS Usage] Retry attempt ${attempt} failed:`, error);
          }
        );
      });

      this.metrics.recordSuccess();

      console.log('[TTS Usage] Recorded successfully:', {
        userId: this.userId || sessionId,
        seconds,
        source,
        isAnonymous: !this.userId,
      });

      callbacks?.onSuccess?.(seconds, !this.userId);

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
      // If immediate tracking fails, queue for later
      console.warn('[TTS Usage] Immediate tracking failed, queuing event:', error);
      
      try {
        await this.usageQueue.enqueue('usage_tracking', {
          seconds,
          source,
          userId: this.userId,
          sessionId,
        });

        console.log('[TTS Usage] Event queued for retry');
      } catch (queueError) {
        // Even queueing failed - this is critical
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[TTS Usage] Failed to queue event:', queueError);
        this.metrics.recordFailure();
        callbacks?.onError?.(err);
        throw err;
      }
    }
  }

  /**
   * Update user ID (useful when user logs in)
   */
  updateUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  /**
   * Update metrics from queue
   */
  private async updateMetrics(): Promise<void> {
    const queueSize = await this.usageQueue.getQueueSize();
    const dlqSize = await this.usageQueue.getDeadLetterQueueSize();
    this.metrics.updateQueueSize(queueSize);
    this.metrics.updateDeadLetterQueueSize(dlqSize);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    await this.updateMetrics();
    return {
      metrics: this.metrics.getMetrics(),
      health: this.metrics.healthCheck(),
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Manually trigger queue processing
   */
  async processQueue(): Promise<void> {
    await this.usageQueue.processQueue();
  }

  /**
   * Reset circuit breaker (for testing/recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

/**
 * Factory function to create usage tracker with current auth state
 */
export function createTTSUsageTracker(userId?: string): TTSUsageTracker {
  return new TTSUsageTracker(userId);
}
