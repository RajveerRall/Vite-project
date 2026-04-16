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
    chunkText: string
  ): string {
    if (!fullText || !chunkText) return this.escapeHtmlChars(fullText);

    // 1. Try exact match first
    let startIndex = fullText.indexOf(chunkText);

    // 2. If exact match fails and we're NOT escaping HTML, we might be dealing with HTML content
    // Try a fuzzy match that ignores HTML tags and whitespace
    if (startIndex === -1 && !this.escapeHtml) {
      try {
        // Create a regex that allows for optional HTML tags and whitespace between words
        const words = chunkText.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length > 0) {
          // Escape each word for regex and join with a pattern that allows tags/spaces
          const pattern = words
            .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('(?:\\s*|<[^>]+>)*');

          const regex = new RegExp(pattern, 'i');
          const match = fullText.match(regex);

          if (match && match.index !== undefined) {
            const before = fullText.substring(0, match.index);
            const highlight = match[0];
            const after = fullText.substring(match.index + highlight.length);

            return `${before}<span class="${this.highlightClass}">${highlight}</span>${after}`;
          }
        }
      } catch (err) {
        console.warn('[HighlightService] Fuzzy match failed:', err);
      }
    }

    // 3. Fallback to normalized comparison (existing logic)
    if (startIndex === -1) {
      const normalizedFull = this.normalizeText(fullText);
      const normalizedChunk = this.normalizeText(chunkText);
      const normalizedIndex = normalizedFull.indexOf(normalizedChunk);

      if (normalizedIndex !== -1) {
        startIndex = this.mapNormalizedIndex(fullText, normalizedFull, normalizedIndex);
      }
    }

    if (startIndex === -1) {
      return this.escapeHtmlChars(fullText);
    }

    const endIndex = startIndex + chunkText.length;
    const before = this.escapeHtmlChars(fullText.substring(0, startIndex));
    const highlight = this.escapeHtmlChars(fullText.substring(startIndex, endIndex));
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

