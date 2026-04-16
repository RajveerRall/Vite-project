
import IDBStorage from '../../utils/idb-storage';

export interface QueuedEvent {
  id: string;
  eventType: string;
  payload: any;
  timestamp: number;
  retries: number;
  lastAttempt: number;
}

type ProcessCallback = (event: QueuedEvent) => Promise<void>;

class UsageTrackingQueue {
  private queueStorage: IDBStorage<QueuedEvent>;
  private deadLetterQueueStorage: IDBStorage<QueuedEvent>;
  private isProcessing: boolean = false;
  private maxRetries: number;
  private processInterval: number;
  private processCallback: ProcessCallback | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(maxRetries: number = 5, processInterval: number = 60000) {
    this.queueStorage = new IDBStorage<QueuedEvent>('UsageTrackingDB', 'eventQueue');
    this.deadLetterQueueStorage = new IDBStorage<QueuedEvent>('UsageTrackingDB', 'deadLetterQueue');
    this.maxRetries = maxRetries;
    this.processInterval = processInterval;
  }

  setProcessCallback(callback: ProcessCallback): void {
    this.processCallback = callback;
    this.startProcessing();
  }

  async enqueue(eventType: string, payload: any): Promise<string> {
    const event: QueuedEvent = {
      id: crypto.randomUUID(),
      eventType,
      payload,
      timestamp: Date.now(),
      retries: 0,
      lastAttempt: 0,
    };
    await this.queueStorage.put(event);
    // Try to process immediately if not already processing
    this.processQueue().catch(console.error);
    return event.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.processCallback) {
      return;
    }
    this.isProcessing = true;

    try {
      const storedItems = await this.queueStorage.getAll();
      for (const storedItem of storedItems) {
        const event = storedItem.data;
        
        if (event.retries >= this.maxRetries) {
          console.warn(`Event ${event.id} reached max retries, moving to DLQ.`);
          await this.deadLetterQueueStorage.put(event);
          await this.queueStorage.delete(event.id);
          continue;
        }

        try {
          await this.processCallback(event);
          await this.queueStorage.delete(event.id);
        } catch (error) {
          console.error(`Failed to process event ${event.id}:`, error);
          event.retries++;
          event.lastAttempt = Date.now();
          await this.queueStorage.put(event);
        }
      }
    } catch (error) {
      console.error("Error processing queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private startProcessing(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => this.processQueue(), this.processInterval);
  }

  stopProcessing(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async getQueueSize(): Promise<number> {
    const events = await this.queueStorage.getAll();
    return events.length;
  }

  async getDeadLetterQueueSize(): Promise<number> {
    const events = await this.deadLetterQueueStorage.getAll();
    return events.length;
  }

  async clearDeadLetterQueue(): Promise<void> {
    await this.deadLetterQueueStorage.clear();
  }

  async getAllQueuedEvents(): Promise<QueuedEvent[]> {
    const storedItems = await this.queueStorage.getAll();
    return storedItems.map(item => item.data);
  }
}

export default UsageTrackingQueue;
