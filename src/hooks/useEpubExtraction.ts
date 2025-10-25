import { useState, useCallback } from 'react';
import { EpubExtractor, Chapter } from '../services/EpubExtractor';

export interface UseEpubExtraction {
  isInitializing: boolean;
  chapters: Chapter[];
  extractChapters: (epubFile: File) => Promise<void>;
  reset: () => void;
}

export function useEpubExtraction(): UseEpubExtraction {
  const [isInitializing, setIsInitializing] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [extractor] = useState(() => new EpubExtractor());

  const extractChapters = useCallback(async (epubFile: File): Promise<void> => {
    setIsInitializing(true);
    setChapters([]);

    try {
      const extractedChapters = await extractor.extractChapters(epubFile);
      setChapters(extractedChapters);
      console.log('[EpubExtraction] Chapters extracted successfully:', extractedChapters.length);
    } catch (err) {
      console.error('[EpubExtraction] Chapter extraction failed:', err);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [extractor]);

  const reset = useCallback(() => {
    setChapters([]);
    setIsInitializing(false);
  }, []);

  return {
    isInitializing,
    chapters,
    extractChapters,
    reset,
  };
}
