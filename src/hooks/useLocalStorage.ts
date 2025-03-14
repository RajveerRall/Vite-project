import localforage from 'localforage';
import { BookData } from '../types/books'; // Adjust the import path as needed

// Configure localForage
localforage.config({
  name: "EbookReaderApp",
  storeName: "mediaStorage",
});

/**
 * Save the entire book data with its file content
 * @param book The complete book data including the file
 */
export const saveBookWithContent = async (book: BookData): Promise<void> => {
  try {
    // Separate the file from the book metadata
    const { file, ...bookMetadata } = book;
    
    // Save book metadata
    await localforage.setItem(`book_metadata_${book.id}`, bookMetadata);
    
    // Save book file content
    await localforage.setItem(`book_file_${book.id}`, file);
  } catch (error) {
    console.error('Error saving book with content:', error);
  }
};

/**
 * Load a book's metadata and file content
 * @param bookId The unique identifier of the book
 * @returns The complete book data or null if not found
 */
export const loadBookWithContent = async (bookId: string): Promise<BookData | null> => {
  try {
    // Load book metadata
    const metadata = await localforage.getItem(`book_metadata_${bookId}`);
    
    // Load book file
    const file = await localforage.getItem(`book_file_${bookId}`);
    
    if (metadata && file) {
      return {
        ...(metadata as Omit<BookData, 'file'>),
        file: file as File
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error loading book with content:', error);
    return null;
  }
};

/**
 * Remove a specific book by its ID
 * @param bookId The unique identifier of the book to remove
 */
export const removeBook = async (bookId: string): Promise<void> => {
  try {
    await localforage.removeItem(`book_metadata_${bookId}`);
    await localforage.removeItem(`book_file_${bookId}`);
  } catch (error) {
    console.error('Error removing book:', error);
  }
};

/**
 * Retrieve all saved book metadata
 * @returns An array of book metadata
 */
export const getAllBookMetadata = async (): Promise<Omit<BookData, 'file'>[]> => {
  try {
    const keys = await localforage.keys();
    const metadataKeys = keys.filter(key => key.startsWith('book_metadata_'));
    
    const metadataPromises = metadataKeys.map(key => 
      localforage.getItem(key) as Promise<Omit<BookData, 'file'>>
    );
    
    return await Promise.all(metadataPromises);
  } catch (error) {
    console.error('Error retrieving book metadata:', error);
    return [];
  }
};

/**
 * Save EPUB file content separately
 * @param bookId The unique identifier of the book
 * @param epubContent The EPUB file content
 */
export const saveEpubContent = async (bookId: string, epubContent: ArrayBuffer | string): Promise<void> => {
  try {
    await localforage.setItem(`epub_content_${bookId}`, epubContent);
  } catch (error) {
    console.error('Error saving EPUB content:', error);
  }
};

/**
 * Load EPUB file content
 * @param bookId The unique identifier of the book
 * @returns The EPUB file content or null
 */
export const loadEpubContent = async (bookId: string): Promise<ArrayBuffer | string | null> => {
  try {
    return await localforage.getItem(`epub_content_${bookId}`);
  } catch (error) {
    console.error('Error loading EPUB content:', error);
    return null;
  }
};

/**
 * Save audio segment
 * @param segmentKey A unique key for the audio segment
 * @param audioData The audio data as a Blob
 */
export const saveAudioSegment = async (segmentKey: string, audioData: Blob): Promise<void> => {
  try {
    await localforage.setItem(`audio_segment_${segmentKey}`, audioData);
  } catch (error) {
    console.error('Error saving audio segment:', error);
  }
};

/**
 * Load audio segment
 * @param segmentKey The unique key of the audio segment
 * @returns The audio segment as a Blob or null
 */
export const loadAudioSegment = async (segmentKey: string): Promise<Blob | null> => {
  try {
    return await localforage.getItem(`audio_segment_${segmentKey}`);
  } catch (error) {
    console.error('Error loading audio segment:', error);
    return null;
  }
};

/**
 * Remove a specific audio segment
 * @param segmentKey The unique key of the audio segment to remove
 */
export const removeAudioSegment = async (segmentKey: string): Promise<void> => {
  try {
    await localforage.removeItem(`audio_segment_${segmentKey}`);
  } catch (error) {
    console.error('Error removing audio segment:', error);
  }
};



