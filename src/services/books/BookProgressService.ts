// src/services/books/BookProgressService.ts
// Service for tracking and syncing reading progress

import { BookData, TOCItem } from '@/types/books';
import { CloudBookRepository } from './repository/CloudBookRepository';

/**
 * Service for managing reading progress sync
 * Extracted from BookContext to separate progress tracking concerns
 */
export class BookProgressService {
  /**
   * Update book progress locally and sync to cloud if authenticated
   */
  static async updateProgress(
    book: BookData,
    currentPage: number,
    lastChapter: TOCItem | null,
    cloudRepository?: CloudBookRepository
  ): Promise<BookData> {
    const updatedBook: BookData = {
      ...book,
      currentPage,
      lastChapter,
      lastRead: new Date().toISOString(),
    };

    // Sync to cloud if repository is provided (user is authenticated)
    if (cloudRepository) {
      try {
        await cloudRepository.updateBookProgress(book.id, currentPage, lastChapter);
        console.log(
          `[BookProgressService] Updated progress for book ${book.id}: page ${currentPage}`
        );
      } catch (error) {
        console.error('[BookProgressService] Error syncing progress:', error);
        // Don't throw - allow local update even if cloud sync fails
      }
    }

    return updatedBook;
  }

  /**
   * Merge cloud progress with local progress
   * Uses the version with the most recent last_read timestamp
   */
  static mergeProgress(
    localBook: BookData,
    cloudBook: {
      current_page: number;
      last_chapter?: string | null;
      total_pages?: number;
      last_read: string;
    }
  ): BookData {
    const cloudDate = new Date(cloudBook.last_read);
    const localDate = new Date(localBook.lastRead);

    // Use the version with the most recent reading progress
    if (cloudDate > localDate) {
      return {
        ...localBook, // Keep local file and cover
        currentPage: cloudBook.current_page,
        lastChapter: cloudBook.last_chapter
          ? {
              id: 'restored-chapter',
              href: cloudBook.last_chapter,
              label:
                cloudBook.last_chapter.split('/').pop()?.replace('.html', '') ||
                'Chapter',
              children: [],
            }
          : localBook.lastChapter,
        totalPages: cloudBook.total_pages || localBook.totalPages,
        lastRead: cloudBook.last_read,
      };
    }

    // Local version is newer or equal
    return localBook;
  }
}

