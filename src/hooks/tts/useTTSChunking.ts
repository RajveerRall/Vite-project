/**
 * useTTSChunking Hook
 * 
 * Manages text chunking for TTS playback.
 * Splits text into sentence-sized chunks and provides utilities for chunk access.
 */

import { useMemo, useCallback } from 'react';
import { splitTextIntoChunks } from './chunkingUtils';

export interface UseTTSChunkingOptions {
    /** The text to split into chunks */
    text: string;
}

export interface UseTTSChunkingReturn {
    /** Array of text chunks (sentences) */
    chunks: string[];
    /** Total number of chunks */
    totalChunks: number;
    /** Get chunk by index, returns null if index is out of bounds */
    getChunkByIndex: (index: number) => string | null;
    /** Check if index is valid */
    isValidChunkIndex: (index: number) => boolean;
    /** Calculate progress percentage based on chunk index */
    getProgressPercentage: (chunkIndex: number) => number;
    /** Find chunk index at a given percentage (0-100) */
    getChunkIndexAtPercentage: (percentage: number) => number;
}

/**
 * Hook for managing TTS text chunking
 * 
 * @example
 * const { chunks, totalChunks, getChunkByIndex } = useTTSChunking({
 *   text: pageText,
 * });
 */
export function useTTSChunking({
    text,
}: UseTTSChunkingOptions): UseTTSChunkingReturn {

    // Memoize chunk splitting - only recalculate when text changes
    const chunks = useMemo(() => {
        if (!text || text.trim().length === 0) {
            return [];
        }
        return splitTextIntoChunks(text);
    }, [text]);

    const totalChunks = chunks.length;

    // Get chunk by index
    const getChunkByIndex = useCallback((index: number): string | null => {
        if (index < 0 || index >= chunks.length) {
            return null;
        }
        return chunks[index];
    }, [chunks]);

    // Check if index is valid
    const isValidChunkIndex = useCallback((index: number): boolean => {
        return index >= 0 && index < chunks.length;
    }, [chunks.length]);

    // Calculate progress percentage based on chunk index
    const getProgressPercentage = useCallback((chunkIndex: number): number => {
        if (totalChunks === 0) return 0;
        if (chunkIndex < 0) return 0;
        if (chunkIndex >= totalChunks) return 100;
        return Math.round((chunkIndex / totalChunks) * 100);
    }, [totalChunks]);

    // Find chunk index at a given percentage (0-100)
    const getChunkIndexAtPercentage = useCallback((percentage: number): number => {
        if (totalChunks === 0) return 0;
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        const targetIndex = Math.floor((clampedPercentage / 100) * totalChunks);
        return Math.min(targetIndex, totalChunks - 1);
    }, [totalChunks]);

    return {
        chunks,
        totalChunks,
        getChunkByIndex,
        isValidChunkIndex,
        getProgressPercentage,
        getChunkIndexAtPercentage,
    };
}

export default useTTSChunking;
