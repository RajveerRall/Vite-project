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
    progress: number = 0,
    cloudRepository?: CloudBookRepository
  ): Promise<BookData> {
    // Increment logical revision
    const currentRevision = book.revision || 0;
    const nextRevision = currentRevision + 1;

    const updatedBook: BookData = {
      ...book,
      currentPage,
      lastChapter,
      progress,
      lastRead: new Date().toISOString(),
      revision: nextRevision
    };

    // Sync to cloud if repository is provided (user is authenticated)
    if (cloudRepository) {
      try {
        await cloudRepository.updateBookProgress(
          book.id,
          currentPage,
          lastChapter,
          progress,
          nextRevision // Pass the new revision
        );
        console.log(
          `[BookProgressService] Updated progress (Rev ${nextRevision}) for book ${book.id}: page ${currentPage}, progress ${progress}%`
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
   * Uses logical revision counter (highest wins) or timestamp fallback
   */
  static mergeProgress(
    localBook: BookData,
    cloudBook: {
      id: string; // Add id for validation
      title?: string;
      author?: string;
      current_page: number;
      last_chapter?: string | null;
      total_pages?: number;
      progress?: number;
      last_read: string;
      revision?: number;
    }
  ): BookData {
    const cloudRev = cloudBook.revision || 0;
    const localRev = localBook.revision || 0;

    const cloudDate = new Date(cloudBook.last_read);
    const localDate = new Date(localBook.lastRead);

    // WINNER: Highest Revision Wins. 
    // If revisions match or are missing, fallback to most recent date.
    let isCloudWinner = false;
    if (cloudRev > localRev) {
      isCloudWinner = true;
    } else if (cloudRev === localRev) {
      isCloudWinner = cloudDate > localDate;
    }

    if (isCloudWinner) {
      console.log(`[BookProgressService] Cloud Wins: Rev ${cloudRev} > ${localRev} (or newer timestamp)`);
      return {
        ...localBook,
        // Metadata protection: never overwrite valid local metadata with empty cloud metadata
        title: cloudBook.title && !cloudBook.title.includes('Loading') ? cloudBook.title : localBook.title,
        author: cloudBook.author && cloudBook.author !== 'Unknown Author' ? cloudBook.author : localBook.author,

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
        progress: cloudBook.progress !== undefined ? cloudBook.progress : localBook.progress,
        lastRead: cloudBook.last_read,
        revision: cloudRev
      };
    }

    // Local version is newer or equal
    return localBook;
  }
}
