import localforage from 'localforage';

/**
 * UsageTracker Service
 * 
 * Tracks when users open the app to identify habitual reading patterns.
 * Stores only the hour of day (0-23) for privacy.
 */

interface UsageLog {
    hour: number; // 0-23
    date: string; // ISO date string
}

const USAGE_HISTORY_KEY = 'usage_history';
const MAX_LOGS = 20; // Cap to prevent storage bloat
const STALE_DAYS = 30; // Ignore logs older than this

export class UsageTracker {
    /**
     * Log the current app open session
     */
    static async logSession(): Promise<void> {
        try {
            const now = new Date();
            const log: UsageLog = {
                hour: now.getHours(),
                date: now.toISOString().split('T')[0] // YYYY-MM-DD
            };

            const history = await this.getHistory();
            history.push(log);

            // Keep only the most recent MAX_LOGS entries
            const trimmed = history.slice(-MAX_LOGS);

            await localforage.setItem(USAGE_HISTORY_KEY, trimmed);
            console.log('[UsageTracker] Session logged:', log);
        } catch (error) {
            console.error('[UsageTracker] Failed to log session:', error);
        }
    }

    /**
     * Get usage history from storage
     */
    private static async getHistory(): Promise<UsageLog[]> {
        try {
            const history = await localforage.getItem<UsageLog[]>(USAGE_HISTORY_KEY);
            return history || [];
        } catch (error) {
            console.error('[UsageTracker] Failed to get history:', error);
            return [];
        }
    }

    /**
     * Calculate the user's peak reading hour
     * Returns the most frequent hour, or 20 (8 PM) as default
     */
    static async getPeakReadingHour(): Promise<number> {
        try {
            const history = await this.getHistory();

            // Filter out stale logs
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - STALE_DAYS);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            const recentLogs = history.filter(log => log.date >= cutoffStr);

            // Need at least 5 data points for meaningful analysis
            if (recentLogs.length < 5) {
                console.log('[UsageTracker] Insufficient data, using default hour 20 (8 PM)');
                return 20; // 8 PM default
            }

            // Count frequency of each hour
            const hourCounts = new Map<number, number>();
            recentLogs.forEach(log => {
                hourCounts.set(log.hour, (hourCounts.get(log.hour) || 0) + 1);
            });

            // Find the most frequent hour
            let maxCount = 0;
            let peakHour = 20; // Default to 8 PM

            hourCounts.forEach((count, hour) => {
                if (count > maxCount) {
                    maxCount = count;
                    peakHour = hour;
                } else if (count === maxCount && hour > peakHour) {
                    // If tied, prefer later hour (evening bias)
                    peakHour = hour;
                }
            });

            console.log('[UsageTracker] Peak reading hour:', peakHour, `(${maxCount} occurrences)`);
            return peakHour;
        } catch (error) {
            console.error('[UsageTracker] Failed to calculate peak hour:', error);
            return 20; // Default to 8 PM on error
        }
    }

    /**
     * Clear all usage history (for testing or user privacy)
     */
    static async clearHistory(): Promise<void> {
        try {
            await localforage.removeItem(USAGE_HISTORY_KEY);
            console.log('[UsageTracker] History cleared');
        } catch (error) {
            console.error('[UsageTracker] Failed to clear history:', error);
        }
    }

    /**
     * Get usage statistics for debugging/settings display
     */
    static async getStats(): Promise<{
        totalSessions: number;
        peakHour: number;
        oldestLog: string | null;
        newestLog: string | null;
    }> {
        const history = await this.getHistory();
        const peakHour = await this.getPeakReadingHour();

        return {
            totalSessions: history.length,
            peakHour,
            oldestLog: history[0]?.date || null,
            newestLog: history[history.length - 1]?.date || null
        };
    }
}
