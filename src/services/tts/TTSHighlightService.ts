/**
 * Service for generating highlighted content HTML
 * Handles text highlighting based on current chunk position
 */

import { TTS_CLASSES } from '../../constants/tts';
import { HighlightOptions } from '../../types/tts';

export class TTSHighlightService {
  private highlightClass: string;
  private escapeHtml: boolean;

  constructor(options?: HighlightOptions) {
    this.highlightClass = options?.highlightClass || TTS_CLASSES.HIGHLIGHT;
    this.escapeHtml = options?.escapeHtml !== false;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtmlChars(str: string): string {
    if (!this.escapeHtml) return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Highlight a specific chunk in the text
   */
  highlightChunk(
    fullText: string,
    chunkText: string,
    chunkIndex: number | null = null
  ): string {
    if (!fullText || !chunkText) return this.escapeHtmlChars(fullText);

    // Try to find the chunk in the text
    let startIndex = fullText.indexOf(chunkText);

    // If exact match fails, try normalized comparison
    if (startIndex === -1) {
      const normalizedFull = this.normalizeText(fullText);
      const normalizedChunk = this.normalizeText(chunkText);
      const normalizedIndex = normalizedFull.indexOf(normalizedChunk);
      
      if (normalizedIndex !== -1) {
        // Map normalized index back to original text (approximate)
        startIndex = this.mapNormalizedIndex(fullText, normalizedFull, normalizedIndex);
      }
    }

    if (startIndex === -1) {
      // Chunk not found, return text as-is
      return this.escapeHtmlChars(fullText);
    }

    const endIndex = startIndex + chunkText.length;
    const before = this.escapeHtmlChars(fullText.substring(0, startIndex));
    const highlight = this.escapeHtmlChars(chunkText);
    const after = this.escapeHtmlChars(fullText.substring(endIndex));

    return `${before}<span class="${this.highlightClass}">${highlight}</span>${after}`;
  }

  /**
   * Highlight a range of text
   */
  highlightRange(fullText: string, start: number, end: number): string {
    if (!fullText || start < 0 || end > fullText.length || start >= end) {
      return this.escapeHtmlChars(fullText);
    }

    const before = this.escapeHtmlChars(fullText.substring(0, start));
    const highlight = this.escapeHtmlChars(fullText.substring(start, end));
    const after = this.escapeHtmlChars(fullText.substring(end));

    return `${before}<span class="${this.highlightClass}">${highlight}</span>${after}`;
  }

  /**
   * Highlight resume position (for resuming playback)
   */
  highlightResumePosition(
    fullText: string,
    resumeIndex: number,
    highlightLength: number = 100
  ): string {
    if (!fullText || resumeIndex < 0 || resumeIndex >= fullText.length) {
      return this.escapeHtmlChars(fullText);
    }

    const start = resumeIndex;
    const end = Math.min(start + highlightLength, fullText.length);

    return this.highlightRange(fullText, start, end);
  }

  /**
   * Clear highlighting (return plain text)
   */
  clearHighlight(text: string): string {
    // Remove highlight spans if present
    return text.replace(/<span class="[^"]*tts-highlight[^"]*">(.*?)<\/span>/gi, '$1');
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ');
  }

  /**
   * Map normalized index back to original text index
   */
  private mapNormalizedIndex(
    originalText: string,
    normalizedText: string,
    normalizedIndex: number
  ): number {
    // Count characters before the normalized index in normalized text
    let charCount = 0;
    for (let i = 0; i < normalizedIndex && i < normalizedText.length; i++) {
      if (normalizedText[i] !== ' ' || (i > 0 && normalizedText[i - 1] !== ' ')) {
        charCount++;
      }
    }

    // Find corresponding position in original text
    let originalIndex = 0;
    let normalizedPos = 0;

    for (let i = 0; i < originalText.length && normalizedPos < charCount; i++) {
      const char = originalText[i];
      if (char !== '\n' && char !== '\r') {
        normalizedPos++;
      }
      if (normalizedPos <= charCount) {
        originalIndex = i + 1;
      }
    }

    return originalIndex;
  }
}

/**
 * Factory function to create highlight service
 */
export function createTTSHighlightService(options?: HighlightOptions): TTSHighlightService {
  return new TTSHighlightService(options);
}

