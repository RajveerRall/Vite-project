
import { AudioStorageService, AudioStorageKeyParams } from './AudioStorageService';
import { getBlobDurationSeconds } from '../../utils/audioUtils';

export interface TTSRequest extends AudioStorageKeyParams {
    text: string;
}

export type QueueStatus = 'idle' | 'downloading' | 'paused';

interface QueueItem extends TTSRequest {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    addedAt: number;
}

/**
 * Manages background TTS downloads with rate limiting and retries
 */
export class TTSQueueManager {
    private static instance: TTSQueueManager;
    private queue: QueueItem[] = [];
    private activeRequests = 0;
    private status: QueueStatus = 'idle';
    private processingPromise: Promise<void> | null = null;
    private abortController: AbortController | null = null;
    private onChunkReadyCallbacks: ((params: AudioStorageKeyParams) => void)[] = [];

    // Config
    private readonly MAX_RETRIES = 3;
    private readonly INITIAL_BACKOFF_MS = 1000;

    // Smart Concurrency
    // If we have less than this many next-chunks ready, we panic (go fast)
    private readonly PANIC_THRESHOLD = 3;
    private currentChapterId: string | null = null;
    private lastCompletedIndex: number = -1;

    private constructor() { }

    public static getInstance(): TTSQueueManager {
        if (!TTSQueueManager.instance) {
            TTSQueueManager.instance = new TTSQueueManager();
        }
        return TTSQueueManager.instance;
    }

    /**
     * Reset queue for a new chapter
     */
    public reset(bookId: string, chapterId: string) {
        this.stop();
        this.queue = [];
        this.currentChapterId = chapterId;
        this.lastCompletedIndex = -1;
        this.status = 'idle';
        // Clear callbacks? No, listeners probably persist across queued chapters
        console.log(`[TTSQueueManager] Reset for Book: ${bookId}, Chapter: ${chapterId}`);
    }

    /**
     * Add chunks to the download queue
     */
    public async addToQueue(requests: TTSRequest[]) {
        if (requests.length === 0) return;

        // Optimization: Batch check existence vs DB
        // We assume all requests are for the same book/chapter usually
        const first = requests[0];
        const existingIndices = await AudioStorageService.getExistingChunkIndices(first.bookId, first.chapterId);

        const newItems: QueueItem[] = [];

        for (const req of requests) {
            // Check if we already have it in DB
            // Note: This assumes voice/speed haven't changed.
            // If they change, we might need a stricter check, but for now cache is by book/chapter/idx/voice/speed
            // The getExistingChunkIndices only checks book/chapter/idx. 
            // FIXME: The key includes voice/speed. The simplified check might return false positives if voice changed.
            // BUT: If the user changes voice, the prefix logic in AudioStorageService doesn't filter by voice.
            // Let's verify AudioStorageService implementation.
            // Prefix: `book_${safeBookId}_ch_${safeChapterId}_`
            // Key: `..._v_${params.voice}_s_${params.speed}_idx_${params.chunkIndex}`
            // The batch check logic I wrote just splits by `_idx_`. 
            // It ignores voice/speed in the key parts before `_idx_`.
            // So if I have "MaleVoice" saved, and request "FemaleVoice", `existingIndices` will say "Yes I have index 5".
            // That's WRONG. We need to check voice/speed too.

            // Reverting to robust check for safety, OR updating Service?
            // "The user wants to start from the middle... tts is firing... timeout".
            // Speed is critical. 
            // Let's rely on standard check for now BUT optimize it?
            // No, 584 checks is simply too slow.
            // Let's assume voice/speed is constant for the batch.

            // Fallback: If verifying properly is hard, let's just use the slow loop but with Promise.all?
            // Promise.all of 500 items might choke the thread.

            // Let's stick to the fast approach but be careful.
            // If I return `hasAudio` to use `getItem`, it's not THAT slow if parallelized.
            // But `keys()` is fast.
            // I'll stick to individual checks but parallelized in chunks.
            // OR I fix the batch check to be accurate.
        }

        // Actually, let's use parallel checks with concurrency limit.
        // It's safer than parsing keys if key format changes.

        const CHECK_CONCURRENCY = 20;
        for (let i = 0; i < requests.length; i += CHECK_CONCURRENCY) {
            const batch = requests.slice(i, i + CHECK_CONCURRENCY);
            await Promise.all(batch.map(async (req) => {
                const exists = await AudioStorageService.hasAudio(req);
                if (!exists) {
                    // Check if already in queue
                    const inQueue = this.queue.find(item =>
                        item.chunkIndex === req.chunkIndex &&
                        item.chapterId === req.chapterId &&
                        item.bookId === req.bookId
                    );

                    if (!inQueue) {
                        newItems.push({
                            ...req,
                            status: 'pending',
                            attempts: 0,
                            addedAt: Date.now()
                        });
                    }
                } else {
                    // Note completed
                    if (req.chapterId === this.currentChapterId) {
                        this.lastCompletedIndex = Math.max(this.lastCompletedIndex, req.chunkIndex);
                    }
                }
            }));
        }

        if (newItems.length > 0) {
            this.queue.push(...newItems);
            // Sort by index to prioritize early chunks
            this.queue.sort((a, b) => a.chunkIndex - b.chunkIndex);
            console.log(`[TTSQueueManager] Added ${newItems.length} chunks to queue. Total pending: ${this.queue.length}`);
            this.startProcessing();
        } else {
            console.log('[TTSQueueManager] All chunks already cached.');
        }
    }

    public onChunkReady(callback: (params: AudioStorageKeyParams) => void) {
        this.onChunkReadyCallbacks.push(callback);
        return () => {
            this.onChunkReadyCallbacks = this.onChunkReadyCallbacks.filter(cb => cb !== callback);
        };
    }

    public prioritize(bookId: string, chapterId: string, chunkIndex: number) {
        console.log(`[TTSQueueManager] Request to prioritize: Book=${bookId}, Ch=${chapterId}, Chunk=${chunkIndex}`);
        const index = this.queue.findIndex(req =>
            req.bookId === bookId &&
            req.chapterId === chapterId &&
            req.chunkIndex === chunkIndex
        );

        if (index > 0) {
            // Move to front
            const [item] = this.queue.splice(index, 1);
            this.queue.unshift(item);
            console.log(`[TTSQueueManager] Prioritized chunk ${chunkIndex}. New Queue Head: ${this.queue[0].chunkIndex}`);

            // Kickstart processing if idle
            this.startProcessing();
        } else if (index === 0) {
            console.log(`[TTSQueueManager] Chunk ${chunkIndex} is already at the front/processing.`);
        } else {
            console.warn(`[TTSQueueManager] Prioritize failed: Chunk ${chunkIndex} not found in pending queue. Queue length: ${this.queue.length}`);
            this.queue.forEach((i, idx) => {
                if (idx < 5) console.log(`   [${idx}] Chunk ${i.chunkIndex} (${i.status})`);
            });
        }
    }

    private notifyChunkReady(item: QueueItem) {
        this.onChunkReadyCallbacks.forEach(cb => cb({
            bookId: item.bookId,
            chapterId: item.chapterId,
            chunkIndex: item.chunkIndex,
            voice: item.voice,
            speed: item.speed
        }));
    }

    public stop() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.status = 'paused';
        this.activeRequests = 0;
    }

    private startProcessing() {
        if (this.status === 'downloading') return; // Already running loop
        this.status = 'downloading';
        this.abortController = new AbortController();
        this.processQueue();
    }

    private async processQueue() {
        if (this.status !== 'downloading') return;

        // Remove completed/failed
        this.queue = this.queue.filter(i => i.status === 'pending' || i.status === 'processing');

        if (this.queue.length === 0) {
            this.status = 'idle';
            console.log('[TTSQueueManager] Queue drained.');
            return;
        }

        // Determine Concurrency
        // Check how many chunks we have ready AHEAD of the last completed one
        // We assume sequential consumption, so if we just finished index 5, and we have 6,7,8 pending...
        // Actually, simple logic:
        // If the *next* item in queue has chunkIndex <= lastCompletedIndex + PANIC_THRESHOLD, 
        // it means the user is "close" to a hole. Panic!

        // Simpler: Just check queue depth?
        // No, panic mode is for when playback is imminent but data is missing.
        // Let's rely on queue order. The queue is sorted.
        // Ideally we want 1 request normally. 2 if we are behind.
        // We "are behind" if Queue[0].index is close to the user's current pos.
        // But we don't know user pos here easily without coupling.
        // Let's use a simpler heuristic:
        // Cruise Mode = 1 concurrent request.
        // Panic Mode = 2 concurrent requests.
        // We are in Panic Mode if the queue has pending items that are low index (relative to chapter start).
        // Or just always use 2 if queue > 5? 
        // Let's stick to the PRD: "buffer < 3". 
        // Since we don't track playback pos here, let's assume "Active Downloads" is the regulator.

        const MAX_CONCURRENT = 2;
        const SAFE_CONCURRENT = 1;

        // For now, let's play it safe and use 1 concurrent request to start, 
        // unless we see we have a LOT to do?
        // Actually, `useTTSQueue` will know the playback position. 
        // Maybe we just expose `setHighPriority(true/false)`?
        // Let's stick to SAFE_CONCURRENT = 1 for now to satisfy "polite" requirement.
        // But allow 2 if queue is very large?

        const concurrency = SAFE_CONCURRENT;

        while (this.activeRequests < concurrency && this.queue.length > 0 && this.status === 'downloading') {
            const item = this.queue.shift(); // Get next priority item
            if (item) {
                this.activeRequests++;
                this.fetchItem(item).then(() => {
                    this.activeRequests--;
                    this.processQueue(); // Loop
                });
            }
        }
    }

    private async fetchItem(item: QueueItem) {
        item.status = 'processing';

        try {
            await this.performFetch(item);

            // Success
            item.status = 'completed';
            this.lastCompletedIndex = Math.max(this.lastCompletedIndex, item.chunkIndex);
            this.notifyChunkReady(item);

        } catch (err: any) {
            if (err.name === 'AbortError') return;

            console.warn(`[TTSQueueManager] Fetch failed for chunk ${item.chunkIndex} (Attempt ${item.attempts + 1})`, err);

            item.attempts++;
            if (item.attempts < this.MAX_RETRIES) {
                item.status = 'pending';

                // Exponential backoff
                const delay = this.INITIAL_BACKOFF_MS * Math.pow(2, item.attempts - 1);
                await new Promise(r => setTimeout(r, delay));

                // Re-queue at start? Or just keep in hand?
                // Push back to front
                this.queue.unshift(item);
            } else {
                item.status = 'failed';
                console.error(`[TTSQueueManager] Chunk ${item.chunkIndex} permanently failed.`);
            }
        }
    }

    private async performFetch(req: TTSRequest): Promise<void> {
        const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
        const apiUrl = (import.meta.env.DEV || !ttsApiUrl) ? '/api/tts' : `${ttsApiUrl}/api/tts`;

        const params = new URLSearchParams({
            text: req.text,
            voice: req.voice,
            format: 'audio-24khz-48kbitrate-mono-mp3'
        });

        if (req.speed !== 1) {
            const speedPercent = Math.round((req.speed - 1) * 100);
            const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
            params.set('rate', speedParam);
        }

        const signal = this.abortController?.signal;
        const response = await fetch(`${apiUrl}?${params.toString()}`, { signal });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Empty blob received');

        // Store it
        await AudioStorageService.storeAudio(req, blob);
    }
}
