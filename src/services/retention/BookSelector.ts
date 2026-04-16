import { BookData } from '@/types/books';

/**
 * BookSelector Service
 * 
 * Intelligently selects which books to feature in retention notifications
 * based on reading progress and recency.
 */

export interface SelectedBooks {
    primary: BookData | null; // Most recent in-progress book
    alternate: BookData | null; // Second choice for variety
    inProgressCount: number; // Total books being read
}

export class BookSelector {
    /**
     * Select books for retention reminders
     * Prioritizes most recently read, in-progress books
     */
    static selectBooksForReminders(books: BookData[]): SelectedBooks {
        // Filter to in-progress books only (not finished)
        const inProgress = books
            .filter(b => (b.progress || 0) < 100)
            .sort((a, b) => {
                // Sort by lastRead date (most recent first)
                const dateA = a.lastRead ? new Date(a.lastRead).getTime() : 0;
                const dateB = b.lastRead ? new Date(b.lastRead).getTime() : 0;
                return dateB - dateA;
            });

        return {
            primary: inProgress[0] || null,
            alternate: inProgress[1] || null,
            inProgressCount: inProgress.length
        };
    }

    /**
     * Generate notification message based on stage and selected books
     */
    static generateMessage(
        stage: 1 | 2 | 3,
        selected: SelectedBooks
    ): { title: string; body: string } | null {
        const { primary, alternate, inProgressCount } = selected;

        // No books in progress - don't send notification
        if (!primary) {
            return null;
        }

        const primaryProgress = Math.round(primary.progress || 0);
        const alternateProgress = alternate ? Math.round(alternate.progress || 0) : 0;

        switch (stage) {
            case 1: // 24 hours - Focus on primary book
                return {
                    title: 'Continue your journey',
                    body: `Ready to pick up where you left off in "${primary.title}"? You're ${primaryProgress}% through!`
                };

            case 2: // 72 hours - Suggest variety
                if (alternate && alternateProgress > 10) {
                    return {
                        title: 'Mix it up',
                        body: `Want a break from "${primary.title}"? "${alternate.title}" is also waiting at ${alternateProgress}%!`
                    };
                } else {
                    return {
                        title: 'Keep the momentum',
                        body: `It's been 3 days! A few pages of "${primary.title}" can brighten your day.`
                    };
                }

            case 3: // 1 week - Library overview
                if (inProgressCount > 1) {
                    return {
                        title: 'Your library awaits',
                        body: `You have ${inProgressCount} books in progress. Pick one up today!`
                    };
                } else {
                    return {
                        title: "Don't lose your streak",
                        body: `"${primary.title}" is waiting for you. Keep your reading habit alive!`
                    };
                }

            default:
                return null;
        }
    }

    /**
     * Check if we should schedule reminders
     * Returns false if all books are finished or no books exist
     */
    static shouldScheduleReminders(books: BookData[]): boolean {
        return books.some(b => (b.progress || 0) < 100);
    }
}
