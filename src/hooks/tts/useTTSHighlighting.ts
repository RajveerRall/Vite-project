/**
 * Hook for managing content highlighting based on current chunk
 */

import { useState, useEffect, useCallback } from 'react';
import { createTTSHighlightService } from '../../services/tts/TTSHighlightService';

export interface UseTTSHighlightingReturn {
  highlightedContent: string;
  highlightChunk: (fullText: string, chunkText: string, chunkIndex: number | null) => void;
  highlightResumePosition: (fullText: string, resumeIndex: number | null) => void;
  clearHighlight: () => void;
}

/**
 * Hook for managing text highlighting
 */
export function useTTSHighlighting(
  defaultContent: string,
  instanceId?: string
): UseTTSHighlightingReturn {
  const [highlightedContent, setHighlightedContent] = useState<string>(defaultContent);
  const highlightService = useCallback(
    () => createTTSHighlightService(),
    []
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
      const highlighted = highlightService.highlightChunk(fullText, chunkText, chunkIndex);
      setHighlightedContent(highlighted);
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
  }, [highlightService, highlightedContent]);

  return {
    highlightedContent,
    highlightChunk,
    highlightResumePosition,
    clearHighlight,
  };
}

