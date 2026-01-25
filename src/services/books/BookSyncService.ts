// src/services/books/BookSyncService.ts
// Service for handling progressive cloud sync logic

import { BookData } from '@/types/books';
import { CloudBookRepository, CloudBookRecord } from './repository/CloudBookRepository';
import { BookProgressService } from './BookProgressService';
import { DefaultBookService } from './DefaultBookService';

export interface SyncResult {
  updatedBooks: BookData[];
  placeholderBooks: BookData[];
  onBookDownloaded: (cloudBook: CloudBookRecord, bookData: BookData) => void;
  onBookDownloadFailed: (cloudBook: CloudBookRecord) => void;
}

/**
 * Service for managing progressive cloud sync
 * Handles downloading books in parallel with placeholder UI updates
 * Extracted from BookContext to separate sync concerns
 */
export class BookSyncService {
  /**
   * Sync books from cloud with progressive download
   * Updates existing books and creates placeholders for missing ones
   */
  static async syncBooksProgressive(
    localBooks: BookData[],
    cloudBooks: CloudBookRecord[],
    cloudRepository: CloudBookRepository,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{
    updatedBooks: BookData[];
    placeholderBooks: BookData[];
    downloadPromises: Promise<BookData | null>[];
  }> {
    // Separate existing and missing books
    const existingBookIds = new Set(localBooks.map(book => book.id));
    const existingCloudBooks = cloudBooks.filter(cloudBook =>
      existingBookIds.has(cloudBook.id)
    );
    const missingCloudBooks = cloudBooks.filter(
      cloudBook => !existingBookIds.has(cloudBook.id)
    );

    console.log(`[BookSyncService] 📊 Books analysis:`);
    console.log(`[BookSyncService] - Already local: ${existingCloudBooks.length} books`);
    console.log(`[BookSyncService] - Need download: ${missingCloudBooks.length} books`);

    // Update existing books with cloud metadata
    let updatedBooks = [...localBooks];
    existingCloudBooks.forEach(cloudBook => {
      const localIndex = updatedBooks.findIndex(book => book.id === cloudBook.id);
      if (localIndex >= 0) {
        updatedBooks[localIndex] = BookProgressService.mergeProgress(
          updatedBooks[localIndex],
          cloudBook
        );
        console.log(
          `[BookSyncService] ♻️ Updated existing book metadata: "${cloudBook.title}"`
        );
      }
    });

    // Preserve default books that aren't in cloud storage
    const defaultBooks = localBooks.filter(
      book =>
        !cloudBooks.some(cloudBook => cloudBook.id === book.id) &&
        DefaultBookService.isDefaultBook(book)
    );

    // Remove duplicates
    const updatedBooksWithoutDuplicates = updatedBooks.filter(
      book =>
        !(
          DefaultBookService.isDefaultBook(book) &&
          defaultBooks.some(defaultBook => defaultBook.id === book.id)
        )
    );

    // Create placeholders for missing books
    const placeholderBooks = missingCloudBooks.map(cloudBook => ({
      id: cloudBook.id,
      title: cloudBook.title || 'Loading...',
      author: cloudBook.author || 'Loading...',
      file: new File([''], 'loading.epub', { type: 'application/epub+zip' }),
      coverUrl: null,
      currentPage: cloudBook.current_page || 0,
      lastChapter: cloudBook.last_chapter
        ? {
          id: 'restored-chapter',
          href: cloudBook.last_chapter,
          label:
            cloudBook.last_chapter.split('/').pop()?.replace('.html', '') ||
            'Chapter',
          children: [],
        }
        : null,
      totalPages: cloudBook.total_pages || 0,
      progress: cloudBook.progress || 0,
      lastRead: cloudBook.last_read || new Date().toISOString(),
      isDownloading: true,
    }));

    console.log(
      `[BookSyncService] 📦 Created ${placeholderBooks.length} placeholder books + ${defaultBooks.length} default books`
    );

    // Start downloading missing books in parallel
    const downloadPromises = missingCloudBooks.map(
      async (cloudBook, index): Promise<BookData | null> => {
        const totalBooks = missingCloudBooks.length;

        const downloadWithRetry = async (retries: number = 3): Promise<BookData | null> => {
          try {
            console.log(
              `[BookSyncService] [${index + 1}/${totalBooks}] Starting download (Attempt ${4 - retries}): "${cloudBook.title}"`
            );

            const bookData = await cloudRepository.downloadBookFile(cloudBook);
            if (!bookData) {
              throw new Error('Download returned empty data');
            }

            // Extract cover if not provided
            let coverUrl = cloudBook.cover_url || null;
            if (!coverUrl) {
              const file = new File(
                [bookData],
                `${cloudBook.title}.epub`,
                { type: 'application/epub+zip' }
              );
              coverUrl = await cloudRepository.extractCoverFromFile(file);
            }

            // Create complete book object
            const completeBook = cloudRepository.convertCloudBookToBookData(
              cloudBook,
              new File([bookData], `${cloudBook.title}.epub`, {
                type: 'application/epub+zip',
              }),
              coverUrl
            );

            if (onProgress) {
              onProgress(index + 1, totalBooks);
            }

            console.log(
              `[BookSyncService] ✅ [${index + 1}/${totalBooks}] "${cloudBook.title}" downloaded successfully`
            );

            return completeBook;
          } catch (error) {
            console.error(
              `[BookSyncService] ❌ Attempt ${4 - retries} failed for "${cloudBook.title}":`,
              error
            );

            if (retries > 1) {
              const delay = (4 - retries) * 2000; // Exponential backoff: 2s, 4s
              console.log(`[BookSyncService] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return downloadWithRetry(retries - 1);
            }

            if (onProgress) {
              onProgress(index + 1, totalBooks);
            }

            // Return failed book placeholder
            return {
              id: cloudBook.id,
              title: `${cloudBook.title} (Download Failed)`,
              author: cloudBook.author || 'Unknown Author',
              file: new File([''], 'download-failed.epub', {
                type: 'application/epub+zip',
              }),
              coverUrl: null,
              currentPage: cloudBook.current_page || 0,
              lastChapter: cloudBook.last_chapter
                ? {
                  id: 'restored-chapter',
                  href: cloudBook.last_chapter,
                  label:
                    cloudBook.last_chapter
                      .split('/')
                      .pop()
                      ?.replace('.html', '') || 'Chapter',
                  children: [],
                }
                : null,
              totalPages: cloudBook.total_pages || 0,
              lastRead: cloudBook.last_read || new Date().toISOString(),
              isDownloading: false,
              downloadFailed: true,
              revision: cloudBook.revision || 0
            };
          }
        };

        return downloadWithRetry();
      }
    );

    return {
      updatedBooks: [...updatedBooksWithoutDuplicates, ...defaultBooks],
      placeholderBooks,
      downloadPromises,
    };
  }

  /**
   * Process downloaded books and update the books array
   */
  static processDownloadedBooks(
    currentBooks: BookData[],
    downloadedBook: BookData | null
  ): BookData[] {
    if (!downloadedBook) {
      return currentBooks;
    }

    return currentBooks.map(book =>
      book.id === downloadedBook.id ? downloadedBook : book
    );
  }
}

