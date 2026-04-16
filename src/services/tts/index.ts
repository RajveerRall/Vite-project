/**
 * Initialization and exports for TTS services
 */

import { createTTSUsageTracker, TTSUsageTracker } from './TTSUsageTracker';
import UsageTrackingQueue from './UsageTrackingQueue';
import UsageMetrics from './UsageMetrics';
import CircuitBreaker from './CircuitBreaker';
import RetryStrategy from './RetryStrategy';

// Singleton instance for app-wide usage
let globalUsageTracker: TTSUsageTracker | null = null;

/**
 * Initialize the usage tracking system
 * Should be called on app startup
 */
export async function initializeUsageTracking(userId?: string): Promise<void> {
  // Create or update global tracker
  if (!globalUsageTracker) {
    globalUsageTracker = createTTSUsageTracker(userId);
  } else {
    globalUsageTracker.updateUserId(userId);
  }

  // Monitor network status for queue processing
  if (typeof window !== 'undefined') {
    // Process queue when network comes back online
    window.addEventListener('online', () => {
      console.log('[Usage Tracking] Network online, processing queue...');
      globalUsageTracker?.processQueue().catch(console.error);
    });

    // Try to process queue periodically
    setInterval(() => {
      if (navigator.onLine) {
        globalUsageTracker?.processQueue().catch(console.error);
      }
    }, 60000); // Every minute
  }

  console.log('[Usage Tracking] Initialized successfully');
}

/**
 * Get the global usage tracker instance
 */
export function getUsageTracker(): TTSUsageTracker | null {
  return globalUsageTracker;
}

/**
 * Update user ID (call when user logs in/out)
 */
export function updateUsageTrackerUserId(userId?: string): void {
  if (globalUsageTracker) {
    globalUsageTracker.updateUserId(userId);
  } else {
    // Initialize if not already done
    initializeUsageTracking(userId).catch(console.error);
  }
}

/**
 * Health check for usage tracking system
 */
export async function getUsageTrackingHealth() {
  if (!globalUsageTracker) {
    return {
      initialized: false,
      error: 'Usage tracker not initialized',
    };
  }

  try {
    const health = await globalUsageTracker.getHealthStatus();
    return {
      initialized: true,
      ...health,
    };
  } catch (error) {
    return {
      initialized: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export all services
export {
  createTTSUsageTracker,
  TTSUsageTracker,
  UsageTrackingQueue,
  UsageMetrics,
  CircuitBreaker,
  RetryStrategy,
};

export type { UsageTrackingCallbacks } from './TTSUsageTracker';

