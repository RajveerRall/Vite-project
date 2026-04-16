/**
 * Hook for managing content highlighting based on current chunk
 */

import { useState, useEffect, useCallback } from 'react';
import { createTTSHighlightService } from '../../services/tts/TTSHighlightService';
import { HighlightOptions } from '../../types/tts';

export interface UseTTSHighlightingReturn {
  highlightedContent: string;
  highlightChunk: (fullText: string, chunkText: string, chunkIndex: number | null) => void;
  highlightResumePosition: (fullText: string, resumeIndex: number | null) => void;
  clearHighlight: () => void;
  activeChunk: string | null;
  chunkIndex: number | null;
}

/**
 * Hook for managing text highlighting
 */
export function useTTSHighlighting(
  defaultContent: string,
  options?: HighlightOptions
): UseTTSHighlightingReturn {
  const [highlightedContent, setHighlightedContent] = useState<string>(defaultContent);
  const [activeChunk, setActiveChunk] = useState<string | null>(null);
  const [chunkIndex, setChunkIndex] = useState<number | null>(null);
  const highlightService = useCallback(
    () => createTTSHighlightService(options),
    [options]
  )();

  // Update when default content changes
  useEffect(() => {
    setHighlightedContent(defaultContent);
  }, [defaultContent]);

  /**
   * Highlight a specific chunk
   */
  const highlightChunk = useCallback(
    (fullText: string, chunkText: string, chunkIndex: number | null) => {
      const highlighted = highlightService.highlightChunk(fullText, chunkText);
      setHighlightedContent(highlighted);
      setActiveChunk(chunkText);
      setChunkIndex(chunkIndex);
    },
    [highlightService]
  );

  /**
   * Highlight resume position
   */
  const highlightResumePosition = useCallback(
    (fullText: string, resumeIndex: number | null) => {
      if (!fullText || resumeIndex === null) {
        setHighlightedContent(fullText);
        return;
      }

      const highlighted = highlightService.highlightResumePosition(fullText, resumeIndex);
      setHighlightedContent(highlighted);
    },
    [highlightService]
  );

  /**
   * Clear highlighting
   */
  const clearHighlight = useCallback(() => {
    const cleared = highlightService.clearHighlight(highlightedContent);
    setHighlightedContent(cleared);
    setActiveChunk(null);
    setChunkIndex(null);
  }, [highlightService, highlightedContent]);

  return {
    highlightedContent,
    highlightChunk,
    highlightResumePosition,
    clearHighlight,
    activeChunk,
    chunkIndex
  };
}

