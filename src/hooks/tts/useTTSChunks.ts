/**
 * Hook for managing TTS chunks (splitting text into chunks)
 */

import { useState, useEffect, useCallback } from 'react';
import { createTTSChunkService } from '../../services/tts/TTSChunkService';

export interface UseTTSChunksReturn {
  chunks: string[];
  chunkService: ReturnType<typeof createTTSChunkService>;
}

/**
 * Hook for managing text chunks
 */
export function useTTSChunks(
  pageText: string,
  instanceId?: string
): UseTTSChunksReturn {
  const [chunks, setChunks] = useState<string[]>([]);
  const chunkService = useCallback(
    () => createTTSChunkService(instanceId),
    [instanceId]
  )();

  // Split text into chunks when pageText changes
  useEffect(() => {
    if (pageText) {
      const newChunks = chunkService.splitText(pageText);
      console.log(`[TTS Chunks] Split text into ${newChunks.length} chunks:`, {
        textLength: pageText.length,
        firstChunk: newChunks[0]?.substring(0, 100),
        lastChunk: newChunks[newChunks.length - 1]?.substring(0, 100),
      });
      setChunks(newChunks);
    } else {
      setChunks([]);
    }
  }, [pageText, chunkService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chunkService.cleanup();
    };
  }, [chunkService]);

  return {
    chunks,
    chunkService,
  };
}

