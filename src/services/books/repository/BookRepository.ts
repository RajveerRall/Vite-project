// src/services/books/repository/BookRepository.ts
// Main repository interface combining local and cloud storage

import { BookData } from '@/types/books';
import { LocalBookRepository } from './LocalBookRepository';
import { CloudBookRepository, CloudBookRecord } from './CloudBookRepository';
import { BookProgressService } from '../BookProgressService';
import { DefaultBookService } from '../DefaultBookService';

/**
 * Main repository interface that coordinates between local and cloud storage
 * Implements the Repository pattern to abstract storage operations
 */
export class BookRepository {
  private localRepo: LocalBookRepository;
  private cloudRepo?: CloudBookRepository;

  constructor(userId?: string) {
    this.localRepo = new LocalBookRepository(userId);
    if (userId) {
      this.cloudRepo = new CloudBookRepository(userId);
    }
  }

  /**
   * Load all books from local storage
   * If no books exist, loads default book
   */
  async loadAllBooks(): Promise<BookData[]> {
    const localBooks = await this.localRepo.loadAllBooks();

    // If no books and user not authenticated, ensure default book is available
    if (localBooks.length === 0) {
      const defaultBook = await DefaultBookService.loadDefaultBook();
      if (defaultBook) {
        return [defaultBook];
      }
    }

    return localBooks;
  }

  /**
   * Save books to local storage and clean up stale books
   */
  async saveBooks(books: BookData[], cleanupStale: boolean = true): Promise<void> {
    if (cleanupStale) {
      const currentBookIds = new Set(books.map(b => b.id));
      await this.localRepo.cleanupStaleBooks(currentBookIds);
    }

    await this.localRepo.saveAllBooks(books);
  }

  /**
   * Save a single book (local + cloud if authenticated)
   */
  async saveBook(book: BookData): Promise<void> {
    await this.localRepo.saveBook(book);

    if (this.cloudRepo) {
      try {
        await this.cloudRepo.syncBookToCloud(book);
      } catch (error) {
        console.error('[BookRepository] Cloud sync failed, but local save succeeded:', error);
        // Don't throw - local save is more important
      }
    }
  }

  /**
   * Remove a book (local + cloud if authenticated)
   */
  async removeBook(bookId: string): Promise<void> {
    await this.localRepo.removeBook(bookId);

    if (this.cloudRepo) {
      try {
        await this.cloudRepo.deleteBook(bookId);
      } catch (error) {
        console.error('[BookRepository] Cloud delete failed, but local remove succeeded:', error);
        // Don't throw - local remove is more important
      }
    }
  }

  /**
   * Update reading progress (local + cloud if authenticated)
   */
  async updateProgress(
    book: BookData,
    currentPage: number,
    lastChapter: any,
    progress: number = 0
  ): Promise<BookData> {
    const updatedBook = await BookProgressService.updateProgress(
      book,
      currentPage,
      lastChapter,
      progress,
      this.cloudRepo
    );

    // Update in local storage
    await this.localRepo.saveBook(updatedBook);

    return updatedBook;
  }

  /**
   * Sync books from cloud (for authenticated users)
   * Returns list of books that need to be downloaded
   */
  async syncFromCloud(
    localBooks: BookData[]
  ): Promise<{
    updatedBooks: BookData[];
    booksToDownload: CloudBookRecord[];
  }> {
    if (!this.cloudRepo) {
      return {
        updatedBooks: localBooks,
        booksToDownload: [],
      };
    }

    const cloudBooks = await this.cloudRepo.fetchUserBooks();

    if (cloudBooks.length === 0) {
      return {
        updatedBooks: localBooks,
        booksToDownload: [],
      };
    }

    // Separate existing and missing books
    const existingBookIds = new Set(localBooks.map(book => book.id));
    const existingCloudBooks = cloudBooks.filter(cloudBook =>
      existingBookIds.has(cloudBook.id)
    );
    const missingCloudBooks = cloudBooks.filter(
      cloudBook => !existingBookIds.has(cloudBook.id)
    );

    // Update existing books with cloud metadata
    let updatedBooks = [...localBooks];
    existingCloudBooks.forEach(cloudBook => {
      const localIndex = updatedBooks.findIndex(book => book.id === cloudBook.id);
      if (localIndex >= 0) {
        updatedBooks[localIndex] = BookProgressService.mergeProgress(
          updatedBooks[localIndex],
          cloudBook
        );
      }
    });

    // Ensure default book is preserved
    const defaultBooks = localBooks.filter(
      book =>
        !cloudBooks.some(cloudBook => cloudBook.id === book.id) &&
        DefaultBookService.isDefaultBook(book)
    );

    updatedBooks = [...updatedBooks.filter(
      book =>
        !(DefaultBookService.isDefaultBook(book) && defaultBooks.some(db => db.id === book.id))
    ), ...defaultBooks];

    return {
      updatedBooks,
      booksToDownload: missingCloudBooks,
    };
  }

  /**
   * Download a book from cloud storage
   */
  async downloadBookFromCloud(
    cloudBook: CloudBookRecord
  ): Promise<BookData | null> {
    if (!this.cloudRepo) {
      throw new Error('Cannot download: user not authenticated');
    }

    try {
      // Download file
      const fileData = await this.cloudRepo.downloadBookFile(cloudBook);
      const file = new File(
        [fileData],
        `${cloudBook.title}.epub`,
        { type: 'application/epub+zip' }
      );

      // Extract cover
      let coverUrl: string | null = cloudBook.cover_url || null;
      if (!coverUrl) {
        coverUrl = await this.cloudRepo.extractCoverFromFile(file);
      }

      // Convert to BookData
      const bookData = this.cloudRepo.convertCloudBookToBookData(
        cloudBook,
        file,
        coverUrl
      );

      // Save to local storage
      await this.localRepo.saveBook(bookData);

      return bookData;
    } catch (error) {
      console.error(
        `[BookRepository] Failed to download book "${cloudBook.title}":`,
        error
      );
      return null;
    }
  }

  /**
   * Clear all books (used on sign out)
   */
  async clearAllBooks(): Promise<void> {
    await this.localRepo.clearAllBooks();
  }
}

