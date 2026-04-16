// src/services/books/DefaultBookService.ts
// Service for managing the default book (1984) loading

import { BookData } from '@/types/books';
import { BookParsingService } from './BookParsingService';

const DEFAULT_BOOK_ID = 'default-book-1984';
const DEFAULT_BOOK_PATH = '/1984.epub';
const DEFAULT_BOOK_TITLE = '1984';

/**
 * Service for loading and managing the default sample book
 * Extracted from BookContext to separate default book concerns
 */
export class DefaultBookService {
  /**
   * Check if a book is the default book
   */
  static isDefaultBook(book: BookData | { id?: string; title?: string }): boolean {
    return book.id === DEFAULT_BOOK_ID || book.title === DEFAULT_BOOK_TITLE;
  }

  /**
   * Check if a book with the given ID or title exists in the books array
   */
  static findDefaultBook(books: BookData[]): BookData | undefined {
    return books.find(
      b => b.id === DEFAULT_BOOK_ID || b.title === DEFAULT_BOOK_TITLE
    );
  }

  /**
   * Load the default book from the public folder
   * Returns null if loading fails
   */
  static async loadDefaultBook(): Promise<BookData | null> {
    try {
      console.log(`[DefaultBookService] Fetching default book from: ${DEFAULT_BOOK_PATH}`);
      
      const response = await fetch(DEFAULT_BOOK_PATH);
      if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }

      const bookBlob = await response.blob();
      const bookFile = new File([bookBlob], '1984.epub', {
        type: 'application/epub+zip',
      });

      // Parse the EPUB file
      const metadata = await BookParsingService.parseEpubDirectly(bookFile);

      // Create book data with consistent ID
      const newBook = BookParsingService.createBookData(
        metadata,
        bookFile,
        DEFAULT_BOOK_ID
      );

      console.log(`[DefaultBookService] Successfully loaded default book: ${newBook.title}`);
      return newBook;
    } catch (error) {
      console.error('[DefaultBookService] Failed to load default book:', error);
      return null;
    }
  }

  /**
   * Ensure default book is available in the books array
   * If it doesn't exist, load it
   */
  static async ensureDefaultBookAvailable(
    books: BookData[]
  ): Promise<BookData | null> {
    const existingBook = this.findDefaultBook(books);
    if (existingBook) {
      console.log('[DefaultBookService] Default book already exists in library');
      return existingBook;
    }

    console.log('[DefaultBookService] Default book not found, loading...');
    return await this.loadDefaultBook();
  }

  /**
   * Check if a key in storage belongs to the default book
   */
  static isDefaultBookKey(key: string, metadata?: BookData): boolean {
    if (metadata && this.isDefaultBook(metadata)) {
      return true;
    }
    // Check if key contains default book identifiers
    return key.includes(DEFAULT_BOOK_ID) || key.includes('1984');
  }
}

