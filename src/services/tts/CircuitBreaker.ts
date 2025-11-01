
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  breakerTimeoutMs?: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private lastOpenTime: number = 0;

  private failureThreshold: number;
  private resetTimeoutMs: number;
  private breakerTimeoutMs: number;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 30000; // Time to wait before going to HALF_OPEN
    this.breakerTimeoutMs = options?.breakerTimeoutMs ?? 60000; // Time to stay in OPEN state
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastOpenTime > this.breakerTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        console.warn("Circuit Breaker: Moving to HALF_OPEN state.");
      } else {
        throw new Error("Circuit Breaker: Service is currently unavailable (OPEN).");
      }
    }

    try {
      const result = await fn();
      this.success();
      return result;
    } catch (error) {
      this.fail();
      throw error;
    }
  }

  private success(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      console.info("Circuit Breaker: Service recovered, moving to CLOSED state.");
    }
    // Reset failure count if in CLOSED state
    if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private fail(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold && this.state === CircuitState.CLOSED) {
      this.state = CircuitState.OPEN;
      this.lastOpenTime = Date.now();
      console.error("Circuit Breaker: Too many failures, moving to OPEN state.");
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastOpenTime = Date.now();
      console.error("Circuit Breaker: Failure in HALF_OPEN state, moving back to OPEN.");
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.lastOpenTime = 0;
    console.info("Circuit Breaker: Manually reset to CLOSED state.");
  }
}

export default CircuitBreaker;
