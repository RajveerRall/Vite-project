// src/services/books/BookParsingService.ts
// Service for parsing book files and extracting metadata, covers, and TOC

import JSZip from 'jszip';
import { BookData } from '@/types/books';
import { getDOMParser } from '../../context/book/domParser';
import { getDirectoryPath, resolveRelativePath } from '../../utils/pathUtils';
import { getAdapterForFile } from '../../context/book/formats';
import { generateUUID } from '../../lib/utils';

export interface BookMetadata {
  title: string;
  author: string;
  coverUrl: string | null;
  totalPages?: number;
}

/**
 * Service for parsing book files and extracting metadata
 * Extracted from BookContext to separate parsing concerns
 */
export class BookParsingService {
  /**
   * Parse a book file using the appropriate adapter (EPUB, PDF, MOBI)
   * This is the modern approach that supports multiple formats
   */
  static async parseBookFile(file: File): Promise<BookMetadata> {
    const adapter = await getAdapterForFile(file);
    if (!adapter) {
      throw new Error('Unsupported format. Currently supported: EPUB, PDF, MOBI');
    }

    const { meta } = await adapter.open(file);
    return {
      title: meta.title,
      author: meta.author,
      coverUrl: meta.coverUrl,
      totalPages: meta.totalPages,
    };
  }

  /**
   * Parse EPUB file directly (legacy method for default book loading)
   * This extracts metadata directly from EPUB without using adapters
   */
  static async parseEpubDirectly(file: File): Promise<BookMetadata> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    
    const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) {
      throw new Error('Invalid EPUB: container.xml not found');
    }

    const DOMParser = await getDOMParser();
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfiles = containerDoc.getElementsByTagName('rootfile');
    
    if (rootfiles.length === 0) {
      throw new Error('Invalid EPUB: No rootfile found');
    }

    const opfPath = rootfiles[0].getAttribute('full-path') || '';
    const opfContent = await loadedZip.file(opfPath)?.async('text');
    
    if (!opfContent) {
      throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
    }

    const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    const titleElement = opfDoc.getElementsByTagName('dc:title')[0];
    const authorElement = opfDoc.getElementsByTagName('dc:creator')[0];
    
    const title = titleElement?.textContent?.trim() || 'Unknown Title';
    const author = authorElement?.textContent?.trim() || 'Unknown Author';

    // Extract cover image
    const coverUrl = await this.extractCoverFromEpub(loadedZip, opfDoc, opfPath);

    return {
      title,
      author,
      coverUrl,
      totalPages: 0, // Will be calculated when book is opened
    };
  }

  /**
   * Extract cover image from EPUB file
   */
  private static async extractCoverFromEpub(
    loadedZip: JSZip,
    opfDoc: Document,
    opfPath: string
  ): Promise<string | null> {
    try {
      const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(
        m => m.getAttribute('name') === 'cover'
      );

      if (!metaCover) {
        return null;
      }

      const coverId = metaCover.getAttribute('content');
      if (!coverId) {
        return null;
      }

      const coverItem = Array.from(opfDoc.getElementsByTagName('item')).find(
        item => item.getAttribute('id') === coverId
      );

      if (!coverItem) {
        return null;
      }

      const href = coverItem.getAttribute('href');
      if (!href) {
        return null;
      }

      const coverPath = resolveRelativePath(getDirectoryPath(opfPath), href);
      const coverBlob = await loadedZip.file(coverPath)?.async('blob');

      if (coverBlob) {
        return URL.createObjectURL(coverBlob);
      }

      return null;
    } catch (error) {
      console.error('[BookParsingService] Error extracting cover:', error);
      return null;
    }
  }

  /**
   * Create a BookData object from parsed metadata
   */
  static createBookData(
    metadata: BookMetadata,
    file: File,
    id?: string
  ): BookData {
    return {
      id: id || generateUUID(),
      title: metadata.title,
      author: metadata.author,
      coverUrl: metadata.coverUrl,
      currentPage: 0,
      totalPages: metadata.totalPages || 0,
      file,
      lastRead: new Date().toISOString(),
    };
  }
}

