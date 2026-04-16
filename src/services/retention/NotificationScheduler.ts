import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { BookData } from '@/types/books';
import { UsageTracker } from './UsageTracker';
import { BookSelector } from './BookSelector';

/**
 * NotificationScheduler Service
 * 
 * Handles scheduling and cancellation of reading reminder notifications.
 * Uses habit-aware timing based on user's peak reading hour.
 */

// Notification IDs for the 3 stages
const NOTIFICATION_IDS = {
    STAGE_1: 1001, // 24 hours
    STAGE_2: 1002, // 72 hours
    STAGE_3: 1003, // 1 week
};

export class NotificationScheduler {
    /**
     * Request notification permissions from the user
     * Should be called on app first launch or when user enables notifications
     */
    static async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) {
            console.log('[NotificationScheduler] Not on native platform, skipping permissions');
            return false;
        }

        try {
            const result = await LocalNotifications.requestPermissions();
            const granted = result.display === 'granted';
            console.log('[NotificationScheduler] Permission result:', granted);
            return granted;
        } catch (error) {
            console.error('[NotificationScheduler] Permission request failed:', error);
            return false;
        }
    }

    /**
     * Check if notifications are currently enabled
     */
    static async checkPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) {
            return false;
        }

        try {
            const result = await LocalNotifications.checkPermissions();
            return result.display === 'granted';
        } catch (error) {
            console.error('[NotificationScheduler] Permission check failed:', error);
            return false;
        }
    }

    /**
     * Cancel all pending notifications
     * Called when user opens the app
     */
    static async cancelAll(): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        try {
            const pending = await LocalNotifications.getPending();
            const ourNotifications = pending.notifications.filter(n =>
                Object.values(NOTIFICATION_IDS).includes(n.id)
            );

            if (ourNotifications.length > 0) {
                await LocalNotifications.cancel({
                    notifications: ourNotifications
                });
                console.log('[NotificationScheduler] Cancelled', ourNotifications.length, 'notifications');
            }
        } catch (error) {
            console.error('[NotificationScheduler] Failed to cancel notifications:', error);
        }
    }

    /**
     * Schedule smart reminders based on user's reading habits
     * Called when user backgrounds the app
     */
    static async scheduleReminders(books: BookData[]): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log('[NotificationScheduler] Not on native platform, skipping scheduling');
            return;
        }

        try {
            // Check if we should schedule (any books in progress?)
            if (!BookSelector.shouldScheduleReminders(books)) {
                console.log('[NotificationScheduler] No books in progress, skipping');
                return;
            }

            // Check permissions
            const hasPermission = await this.checkPermissions();
            if (!hasPermission) {
                console.log('[NotificationScheduler] No notification permission, skipping');
                return;
            }

            // Get user's peak reading hour
            const peakHour = await UsageTracker.getPeakReadingHour();

            // Select books for notifications
            const selected = BookSelector.selectBooksForReminders(books);

            // Schedule the 3 stages
            const notifications = [];

            // Stage 1: Next occurrence of peak hour (at least 18h away)
            const stage1Time = this.getNextOccurrence(peakHour, 18);
            const stage1Message = BookSelector.generateMessage(1, selected);
            if (stage1Message) {
                notifications.push({
                    id: NOTIFICATION_IDS.STAGE_1,
                    title: stage1Message.title,
                    body: stage1Message.body,
                    schedule: { at: stage1Time },
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: '',
                    extra: null
                });
            }

            // Stage 2: 72 hours from now (at peak hour)
            const stage2Time = this.getNextOccurrence(peakHour, 72);
            const stage2Message = BookSelector.generateMessage(2, selected);
            if (stage2Message) {
                notifications.push({
                    id: NOTIFICATION_IDS.STAGE_2,
                    title: stage2Message.title,
                    body: stage2Message.body,
                    schedule: { at: stage2Time },
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: '',
                    extra: null
                });
            }

            // Stage 3: 1 week from now (at peak hour)
            const stage3Time = this.getNextOccurrence(peakHour, 168);
            const stage3Message = BookSelector.generateMessage(3, selected);
            if (stage3Message) {
                notifications.push({
                    id: NOTIFICATION_IDS.STAGE_3,
                    title: stage3Message.title,
                    body: stage3Message.body,
                    schedule: { at: stage3Time },
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: '',
                    extra: null
                });
            }

            if (notifications.length > 0) {
                await LocalNotifications.schedule({ notifications });
                console.log('[NotificationScheduler] Scheduled', notifications.length, 'notifications at hour', peakHour);
            }
        } catch (error) {
            console.error('[NotificationScheduler] Failed to schedule notifications:', error);
        }
    }

    /**
     * Calculate the next occurrence of a specific hour
     * that is at least minHoursAway from now
     */
    private static getNextOccurrence(targetHour: number, minHoursAway: number): Date {
        const now = new Date();
        const target = new Date();

        // Set to target hour today
        target.setHours(targetHour, 0, 0, 0);

        // If that time has passed or is too soon, move to next day
        const hoursUntilTarget = (target.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilTarget < minHoursAway) {
            // Add days until we're at least minHoursAway away
            const daysToAdd = Math.ceil((minHoursAway - hoursUntilTarget) / 24);
            target.setDate(target.getDate() + daysToAdd);
        }

        return target;
    }

    /**
     * Get list of currently pending notifications (for debugging/settings)
     */
    static async getPendingNotifications(): Promise<Array<{
        id: number;
        title: string;
        scheduledAt: Date;
    }>> {
        if (!Capacitor.isNativePlatform()) {
            return [];
        }

        try {
            const pending = await LocalNotifications.getPending();
            return pending.notifications
                .filter(n => Object.values(NOTIFICATION_IDS).includes(n.id))
                .map(n => ({
                    id: n.id,
                    title: n.title || '',
                    scheduledAt: n.schedule?.at ? new Date(n.schedule.at) : new Date()
                }));
        } catch (error) {
            console.error('[NotificationScheduler] Failed to get pending notifications:', error);
            return [];
        }
    }
}
