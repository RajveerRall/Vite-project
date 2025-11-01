/**
 * Health check utilities for usage tracking system
 */

import { getUsageTracker, getUsageTrackingHealth } from '../services/tts/index';

export interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
  metrics?: {
    queueSize: number;
    deadLetterQueueSize: number;
    successRate: number;
    failureRate: number;
  };
  circuitBreakerState?: string;
}

/**
 * Perform a comprehensive health check
 */
export async function checkUsageTrackingHealth(): Promise<HealthCheckResult> {
  try {
    const health = await getUsageTrackingHealth();

    if (!health.initialized) {
      return {
        healthy: false,
        issues: ['Usage tracker not initialized'],
      };
    }

    const issues: string[] = [];
    
    if (health.health && !health.health.healthy) {
      issues.push(...health.health.issues);
    }

    const metrics = health.metrics;
    if (metrics) {
      if (metrics.queueSize > 100) {
        issues.push(`Queue size is high: ${metrics.queueSize}`);
      }
      
      if (metrics.deadLetterQueueSize > 50) {
        issues.push(`Dead letter queue has ${metrics.deadLetterQueueSize} failed events`);
      }

      const successRate = metrics.totalEvents > 0
        ? (metrics.successCount / metrics.totalEvents) * 100
        : 100;

      if (successRate < 50 && metrics.totalEvents > 10) {
        issues.push(`Low success rate: ${successRate.toFixed(2)}%`);
      }
    }

    if (health.circuitBreakerState === 'OPEN') {
      issues.push('Circuit breaker is OPEN - service may be unavailable');
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics: metrics ? {
        queueSize: metrics.queueSize,
        deadLetterQueueSize: metrics.deadLetterQueueSize,
        successRate: metrics.totalEvents > 0
          ? (metrics.successCount / metrics.totalEvents) * 100
          : 100,
        failureRate: metrics.totalEvents > 0
          ? (metrics.failureCount / metrics.totalEvents) * 100
          : 0,
      } : undefined,
      circuitBreakerState: health.circuitBreakerState,
    };
  } catch (error) {
    return {
      healthy: false,
      issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Manual retry for failed queue processing
 */
export async function retryFailedEvents(): Promise<{ success: boolean; message: string }> {
  try {
    const tracker = getUsageTracker();
    if (!tracker) {
      return {
        success: false,
        message: 'Usage tracker not initialized',
      };
    }

    await tracker.processQueue();
    return {
      success: true,
      message: 'Queue processing triggered successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Reset circuit breaker manually
 */
export function resetCircuitBreaker(): { success: boolean; message: string } {
  try {
    const tracker = getUsageTracker();
    if (!tracker) {
      return {
        success: false,
        message: 'Usage tracker not initialized',
      };
    }

    tracker.resetCircuitBreaker();
    return {
      success: true,
      message: 'Circuit breaker reset successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

