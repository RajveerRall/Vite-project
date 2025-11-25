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
  skipLimitCheck?: boolean; // ✅ If true, skip limit check but still record usage
}

export class TTSUsageTracker {
  private userId: string | undefined;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private usageQueue: UsageTrackingQueue;
  private metrics: UsageMetrics;
  // ✅ Cache for limit check results (30 second cache)
  private limitCheckCache: { 
    result: { allowed: boolean; reason?: string }; 
    timestamp: number;
  } | null = null;
  private readonly LIMIT_CHECK_CACHE_MS = 30000; // Cache for 30 seconds

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
   * @param userId - User ID to check limit for
   * @param forceCheck - If true, bypass cache and force a fresh check
   */
  private async checkUsageLimit(userId: string, forceCheck: boolean = false): Promise<{ allowed: boolean; reason?: string }> {
    // ✅ Use cached result if recent and not forcing check
    if (!forceCheck) {
      const now = Date.now();
      if (this.limitCheckCache && (now - this.limitCheckCache.timestamp) < this.LIMIT_CHECK_CACHE_MS) {
        console.log('[TTS Usage] Using cached limit check result');
        return this.limitCheckCache.result;
      }
    }
    
    try {
      const { getAccessToken } = await import('../../lib/authToken');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[TTS Usage] Missing Supabase env vars, allowing usage');
        const result = { allowed: true };
        this.limitCheckCache = { result, timestamp: Date.now() };
        return result;
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
            const { supabase } = await import('../../lib/supabase'); // Keep this import
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession(); // This is the correct way
            
            if (sessionError || !session?.access_token) {
              throw new Error('Failed to refresh session');
            }

            console.log('[TTS Usage] Limit check token refreshed, retrying...');

            // Retry with new token
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 5000);

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
              const result = { allowed: true }; // Fail open
              this.limitCheckCache = { result, timestamp: Date.now() };
              return result;
            }

            const data = await retryResponse.json();

            if (data?.limit_exceeded) {
              const result = {
                allowed: false,
                reason: `Usage limit exceeded. ${data.minutes_used}/${data.minutes_limit} minutes used.`,
              };
              this.limitCheckCache = { result, timestamp: Date.now() };
              return result;
            }

            const result = { allowed: true };
            this.limitCheckCache = { result, timestamp: Date.now() };
            return result;

          } catch (refreshOrRetryError: any) {
            // This single catch block handles both refresh and retry errors
            if (refreshOrRetryError.name !== 'AbortError') {
              console.warn('[TTS Usage] Token refresh or retry failed, allowing usage:', refreshOrRetryError.message);
            }
            const result = { allowed: true }; // Fail open
            this.limitCheckCache = { result, timestamp: Date.now() };
            return result;
          }
        }
        
        if (!response.ok) {
          console.warn('[TTS Usage] Limit check failed, allowing usage:', response.status);
          const result = { allowed: true }; // Fail open
          this.limitCheckCache = { result, timestamp: Date.now() };
          return result;
        }
        
        const data = await response.json();
        
        if (data?.limit_exceeded) {
          const result = {
            allowed: false,
            reason: `Usage limit exceeded. ${data.minutes_used}/${data.minutes_limit} minutes used.`,
          };
          this.limitCheckCache = { result, timestamp: Date.now() };
          return result;
        }
        
        const result = { allowed: true };
        this.limitCheckCache = { result, timestamp: Date.now() };
        return result;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name !== 'AbortError') {
          console.warn('[TTS Usage] Limit check error, allowing usage:', fetchError.message);
        }
      }
    } catch (error) {
      console.warn('[TTS Usage] Error checking limit, allowing usage:', error);
    }
    const result = { allowed: true }; // Fail open by default
    this.limitCheckCache = { result, timestamp: Date.now() };
    return result;
  }

  /**
   * Direct tracking (bypasses queue, used for immediate attempts)
   * Uses REST API instead of RPC to avoid hanging
   * @param skipLimitCheck - If true, skip limit check but still record usage
   */
  private async trackUsageDirect(
    seconds: number,
    source: string,
    userId?: string,
    sessionId?: string,
    skipLimitCheck: boolean = false
  ): Promise<void> {
    const { getAccessToken } = await import('../../lib/authToken');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (userId && !skipLimitCheck) {
      // Check limit before recording (with REST API)
      const limitCheck = await this.checkUsageLimit(userId, false);
      if (!limitCheck.allowed) {
        const error = new Error(limitCheck.reason || 'Usage limit exceeded');
        (error as any).code = 'TTS_USAGE_LIMIT_EXCEEDED';
        throw error;
      }

      // Authenticated user - record usage via REST API
      const eventId = crypto.randomUUID();
      const url = `${supabaseUrl}/rest/v1/rpc/increment_tts_usage`;
      
      // ✅ DEBUG: Log what we're sending to verify units
      console.log('[TTS Usage] Recording usage:', {
        userId,
        seconds: seconds,  // Should be in seconds (2-7 typically)
        secondsType: typeof seconds,
        secondsValue: seconds,
        source,
        eventId,
        url
      });
      
      const accessToken = await getAccessToken(5000);
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const requestBody = {
        p_user_id: userId,
        p_seconds: seconds,
        p_source: source,
        p_event_id: eventId,
      };
      
      // ✅ DEBUG: Log the exact request body being sent
      console.log('[TTS Usage] Request body being sent to increment_tts_usage:', JSON.stringify(requestBody, null, 2));
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(requestBody),
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
            
            if (!session?.access_token) {
              throw new Error('Failed to refresh session, new access token not found.');
            }

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
        
        // ✅ DEBUG: Log successful response
        console.log('[TTS Usage] Successfully recorded usage:', {
          userId,
          seconds,
          responseStatus: response.status,
          responseOk: response.ok
        });
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Usage tracking request timeout after 10 seconds');
        }
        throw fetchError;
      }
    } else if (sessionId) {
      // Anonymous user - use REST API (no auth token needed - RLS allows anonymous access)
      const url = `${supabaseUrl}/rest/v1/rpc/record_anonymous_tts_usage`;
      
      // ✅ FIXED: Anonymous users don't have access tokens - use anon key only
      // The RLS policies allow "Anyone can insert/update" for anonymous usage
      // The anon key in 'apikey' header is sufficient for public RLS policies
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            // ✅ FIXED: No Authorization header needed for anonymous users
            // The anon key in 'apikey' header is sufficient for public RLS policies
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
    // ✅ DEBUG: Always log what would be sent (even if tracking is disabled)
    console.log('[TTS Usage] recordUsageSeconds called:', {
      seconds,
      secondsType: typeof seconds,
      secondsValue: seconds,
      source,
      userId: this.userId,
      isTrackingEnabled: isTrackingEnabled()
    });
    
    // Skip tracking if disabled in development
    if (!isTrackingEnabled()) {
      console.log('[TTS Usage] Tracking disabled in development - skipping usage recording');
      return;
    }

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
              sessionId,
              callbacks?.skipLimitCheck ?? false
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
    // ✅ NEW: If a user logs in, immediately try to process any queued events
    // This helps clear the queue for events that were triggered before the user ID was set.
    if (userId) {
      this.processQueue().catch(err => console.warn('[TTS Usage] Error processing queue after user update:', err));
    }
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
