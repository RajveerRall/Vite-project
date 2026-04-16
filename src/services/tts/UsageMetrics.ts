/**
 * Service for tracking usage metrics and observability
 */

interface MetricsData {
  successCount: number;
  failureCount: number;
  totalEvents: number;
  lastSuccessTime: number | null;
  lastFailureTime: number | null;
  queueSize: number;
  deadLetterQueueSize: number;
}

class UsageMetrics {
  private metrics: MetricsData = {
    successCount: 0,
    failureCount: 0,
    totalEvents: 0,
    lastSuccessTime: null,
    lastFailureTime: null,
    queueSize: 0,
    deadLetterQueueSize: 0,
  };

  recordSuccess(): void {
    this.metrics.successCount++;
    this.metrics.totalEvents++;
    this.metrics.lastSuccessTime = Date.now();
  }

  recordFailure(): void {
    this.metrics.failureCount++;
    this.metrics.totalEvents++;
    this.metrics.lastFailureTime = Date.now();
  }

  updateQueueSize(size: number): void {
    this.metrics.queueSize = size;
  }

  updateDeadLetterQueueSize(size: number): void {
    this.metrics.deadLetterQueueSize = size;
  }

  getMetrics(): MetricsData {
    return { ...this.metrics };
  }

  getSuccessRate(): number {
    if (this.metrics.totalEvents === 0) return 0;
    return (this.metrics.successCount / this.metrics.totalEvents) * 100;
  }

  getFailureRate(): number {
    if (this.metrics.totalEvents === 0) return 0;
    return (this.metrics.failureCount / this.metrics.totalEvents) * 100;
  }

  reset(): void {
    this.metrics = {
      successCount: 0,
      failureCount: 0,
      totalEvents: 0,
      lastSuccessTime: null,
      lastFailureTime: null,
      queueSize: 0,
      deadLetterQueueSize: 0,
    };
  }

  async reportToAnalytics(): Promise<void> {
    // Placeholder for reporting to analytics service
    // This can be extended to send metrics to external services
    const metrics = this.getMetrics();
    console.log('[UsageMetrics] Current metrics:', {
      successRate: `${this.getSuccessRate().toFixed(2)}%`,
      failureRate: `${this.getFailureRate().toFixed(2)}%`,
      queueSize: metrics.queueSize,
      deadLetterQueueSize: metrics.deadLetterQueueSize,
    });
  }

  healthCheck(): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (this.metrics.failureCount > 10 && this.getFailureRate() > 50) {
      issues.push('High failure rate detected');
    }
    
    if (this.metrics.queueSize > 100) {
      issues.push('Queue size is abnormally high');
    }
    
    if (this.metrics.deadLetterQueueSize > 50) {
      issues.push('Dead letter queue has many failed events');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

export default UsageMetrics;

