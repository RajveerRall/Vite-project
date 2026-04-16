
interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  factor?: number;
}

class RetryStrategy {
  private maxRetries: number;
  private delayMs: number;
  private factor: number;

  constructor(options?: RetryOptions) {
    this.maxRetries = options?.maxRetries ?? 3;
    this.delayMs = options?.delayMs ?? 1000; // Initial delay in milliseconds
    this.factor = options?.factor ?? 2;
  }

  async execute<T>(fn: () => Promise<T>, onError?: (error: any, attempt: number) => void): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        onError?.(error, attempt);
        if (attempt === this.maxRetries) {
          throw error; // Re-throw after last attempt
        }
        const delay = this.delayMs * Math.pow(this.factor, attempt - 1);
        console.log(`Retrying in ${delay / 1000} seconds... (Attempt ${attempt}/${this.maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("RetryStrategy: Max retries reached, function failed.");
  }
}

export default RetryStrategy;
