import { useState, useCallback } from 'react';
import { EpubExtractor, Chapter } from '../services/EpubExtractor';

/**
 * Remove common prefix text that appears at the START of ALL chapters.
 * Only removes if the EXACT same text starts every single chapter.
 */
function removeCommonStartingPrefix(chapters: Chapter[]): Chapter[] {
  if (chapters.length < 2) return chapters;
  
  const minLength = Math.min(...chapters.map(ch => ch.content.length));
  
  // Debug: log first few characters of each chapter
  console.log('[Common Prefix] First 50 chars of first 5 chapters:');
  for (let i = 0; i < Math.min(5, chapters.length); i++) {
    const preview = chapters[i].content.substring(0, 50).replace(/\n/g, '\\n');
    console.log(`  Chapter ${i + 1}: "${preview}..."`);
  }
  
  // Find the longest exact character-by-character match that appears in MOST chapters
  // Use "majority rule": if 70% of chapters match, consider it common
  const majorityThreshold = Math.ceil(chapters.length * 0.7);
  let commonPrefixLength = 0;
  
  for (let i = 0; i < minLength; i++) {
    const char = chapters[0].content[i];
    const matchesCount = chapters.filter(ch => ch.content[i] === char).length;
    
    if (matchesCount >= majorityThreshold) {
      commonPrefixLength = i + 1;
    } else {
      break;
    }
  }
  
  console.log(`[Common Prefix] Found common prefix of ${commonPrefixLength} characters (appears in majority of chapters)`);
  
  // If no common prefix found, return unchanged
  if (commonPrefixLength === 0) {
    console.log('[Common Prefix] No common prefix found');
    return chapters;
  }
  
  // Remove the exact common prefix from all chapters
  const removedPrefix = chapters[0].content.substring(0, commonPrefixLength);
  console.log(`[Common Prefix] Removing ${commonPrefixLength} character prefix from ALL chapters:`);
  console.log(`[Common Prefix] "${removedPrefix}"`);
  
  return chapters.map(chapter => ({
    ...chapter,
    content: chapter.content.substring(commonPrefixLength).trim()
  }));
}

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
      console.log('[EpubExtraction] Raw chapters extracted:', extractedChapters.length);
      
      // Remove common starting prefix (e.g., Gutenberg headers)
      console.log('[EpubExtraction] Calling removeCommonStartingPrefix...');
      const cleanedChapters = removeCommonStartingPrefix(extractedChapters);
      console.log('[EpubExtraction] Prefix removal complete. Cleaned chapters:', cleanedChapters.length);
      
      setChapters(cleanedChapters);
      console.log('[EpubExtraction] Chapters set in state:', cleanedChapters.length);
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
