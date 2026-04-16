import { useState, useEffect, useCallback } from 'react';
import { getUsageTracker, getUsageTrackingHealth } from '../services/tts/index';

interface UsageTrackingMetrics {
  successCount: number;
  failureCount: number;
  totalEvents: number;
  queueSize: number;
  deadLetterQueueSize: number;
  successRate: number;
  failureRate: number;
}

interface HealthStatus {
  initialized: boolean;
  metrics?: {
    successCount: number;
    failureCount: number;
    totalEvents: number;
    queueSize: number;
    deadLetterQueueSize: number;
    lastSuccessTime: number | null;
    lastFailureTime: number | null;
  };
  health?: {
    healthy: boolean;
    issues: string[];
  };
  circuitBreakerState?: string;
  error?: string;
}

export function useUsageTrackingMonitor() {
  const [metrics, setMetrics] = useState<UsageTrackingMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const tracker = getUsageTracker();
      
      if (!tracker) {
        setMetrics(null);
        setHealth({
          initialized: false,
          error: 'Usage tracker not initialized',
        });
        return;
      }

      const trackerMetrics = tracker.getMetrics();
      const healthStatus = await getUsageTrackingHealth();

      const successRate = trackerMetrics.totalEvents > 0
        ? (trackerMetrics.successCount / trackerMetrics.totalEvents) * 100
        : 0;
      const failureRate = trackerMetrics.totalEvents > 0
        ? (trackerMetrics.failureCount / trackerMetrics.totalEvents) * 100
        : 0;

      setMetrics({
        successCount: trackerMetrics.successCount,
        failureCount: trackerMetrics.failureCount,
        totalEvents: trackerMetrics.totalEvents,
        queueSize: trackerMetrics.queueSize,
        deadLetterQueueSize: trackerMetrics.deadLetterQueueSize,
        successRate,
        failureRate,
      });

      setHealth(healthStatus);
    } catch (error) {
      console.error('[Usage Tracking Monitor] Failed to refresh metrics:', error);
      setHealth({
        initialized: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerQueueProcessing = useCallback(async () => {
    const tracker = getUsageTracker();
    if (tracker) {
      await tracker.processQueue();
      await refreshMetrics();
    }
  }, [refreshMetrics]);

  const resetCircuitBreaker = useCallback(() => {
    const tracker = getUsageTracker();
    if (tracker) {
      tracker.resetCircuitBreaker();
      refreshMetrics();
    }
  }, [refreshMetrics]);

  useEffect(() => {
    // Initial load
    refreshMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);

    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return {
    metrics,
    health,
    isLoading,
    refreshMetrics,
    triggerQueueProcessing,
    resetCircuitBreaker,
  };
}

