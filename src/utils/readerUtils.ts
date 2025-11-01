// src/utils/readerUtils.ts
// Utility functions for Reader component

import { FULL_CAST_MAX_CHARS } from '../constants/readerConstants';

/**
 * Split text into chunks for Full Cast processing
 * Splits by paragraphs first, then into fixed-size segments
 */
export function splitTextForFullCast(fullText: string): string[] {
  const paras = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  const sources = paras.length > 0 ? paras : [fullText];
  
  for (const src of sources) {
    const t = src.trim();
    if (!t) continue;
    
    // Split into fixed-size chunks
    for (let i = 0; i < t.length; i += FULL_CAST_MAX_CHARS) {
      chunks.push(t.slice(i, i + FULL_CAST_MAX_CHARS));
    }
  }
  
  return chunks;
}

/**
 * Get text content from page (falls back to content if pageText unavailable)
 */
export function getPageTextContent(pageText: string | undefined, content: string | undefined): string {
  return (pageText || content || '').trim();
}

