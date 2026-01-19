/**
 * TTS Text Chunking Utilities
 * 
 * Pure functions for splitting text into sentence chunks suitable for TTS.
 * Handles abbreviations, punctuation normalization, and edge cases.
 */

// Common abbreviations that should NOT trigger sentence splits
const ABBREVIATIONS = [
    // Titles
    'Dr\\.', 'Mr\\.', 'Mrs\\.', 'Ms\\.', 'Prof\\.', 'Rev\\.', 'Sr\\.', 'Jr\\.', 'Esq\\.',
    // Time
    'A\\.M\\.', 'P\\.M\\.', 'a\\.m\\.', 'p\\.m\\.',
    // Locations
    'U\\.S\\.', 'U\\.K\\.', 'E\\.U\\.', 'U\\.S\\.A\\.',
    // Latin
    'etc\\.', 'i\\.e\\.', 'e\\.g\\.', 'vs\\.', 'et al\\.',
    // Academic
    'Ph\\.D\\.', 'M\\.D\\.', 'B\\.A\\.', 'M\\.A\\.', 'B\\.S\\.', 'M\\.S\\.',
    // Common
    'Inc\\.', 'Ltd\\.', 'Corp\\.', 'Co\\.',
    // Additional common ones
    'St\\.', 'Ave\\.', 'Blvd\\.', 'Rd\\.', 'No\\.', 'Vol\\.', 'Ch\\.', 'pp\\.'
];

// Create a regex pattern to match abbreviations (case-insensitive)
const ABBREVIATION_PATTERN = new RegExp(
    `\\b(${ABBREVIATIONS.join('|')})\\b`,
    'gi'
);

/**
 * Check if a potential split point is an abbreviation
 */
function isAbbreviationAtPosition(text: string, position: number): boolean {
    // Look back to find the word before the punctuation (up to 50 chars for longer contexts)
    const beforePunct = text.substring(Math.max(0, position - 50), position);
    const words = beforePunct.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const lastTwoWords = words.slice(-2).join(' ');

    // Check if last word + period matches an abbreviation
    const wordWithPeriod = lastWord + text[position];
    const isSingleWordAbbr = ABBREVIATIONS.some(abbr => {
        const abbrClean = abbr.replace(/\\/g, ''); // Remove regex escaping
        const pattern = new RegExp(`^${abbrClean}$`, 'i');
        return pattern.test(wordWithPeriod);
    });

    // Check for multi-word abbreviations like "et al."
    const isMultiWordAbbr = /et\s+al\./i.test(lastTwoWords + text[position]);

    return isSingleWordAbbr || isMultiWordAbbr;
}

/**
 * Normalize text spacing for proper sentence detection
 */
function normalizeTextSpacing(text: string): string {
    let normalizedText = text;

    // First, temporarily mark abbreviations to protect them
    const abbreviationMap = new Map<string, string>();
    let placeholderIndex = 0;

    normalizedText = normalizedText.replace(ABBREVIATION_PATTERN, (match) => {
        const placeholder = `__ABBR_${placeholderIndex}__`;
        abbreviationMap.set(placeholder, match);
        placeholderIndex++;
        return placeholder;
    });

    // Now normalize spacing after punctuation (only when followed by a letter)
    normalizedText = normalizedText.replace(/([.!?])([A-Za-z])/g, '$1 $2');

    // Restore abbreviations
    abbreviationMap.forEach((abbreviation, placeholder) => {
        normalizedText = normalizedText.replace(placeholder, abbreviation);
    });

    return normalizedText;
}

/**
 * Split text into sentence chunks for TTS
 * 
 * This function intelligently splits text at sentence boundaries while:
 * - Preserving abbreviations (Dr., Mr., etc.)
 * - Handling punctuation normalization
 * - Producing chunks suitable for TTS playback
 * 
 * @param text - The text to split into chunks
 * @returns Array of text chunks (sentences)
 */
export function splitTextIntoChunks(text: string): string[] {
    if (!text || text.trim().length === 0) {
        return [];
    }

    const normalizedText = normalizeTextSpacing(text);

    // Split manually, checking each potential split point
    const chunks: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < normalizedText.length; i++) {
        const char = normalizedText[i];
        currentChunk += char;

        // Check if we hit a potential sentence boundary
        if (/[.!?]/.test(char)) {
            const nextChar = normalizedText[i + 1];
            const isEndOfText = i === normalizedText.length - 1;
            const isFollowedBySpace = nextChar === ' ' || nextChar === '\n' || nextChar === '\t';

            if ((isFollowedBySpace || isEndOfText) && !isAbbreviationAtPosition(normalizedText, i)) {
                // This is a real sentence boundary
                const trimmed = currentChunk.trim();
                if (trimmed.length > 0) {
                    chunks.push(trimmed);
                }
                currentChunk = '';

                // Skip the space
                if (isFollowedBySpace) {
                    i++; // Skip the space character
                }
            }
        }
    }

    // Add remaining text
    const trimmed = currentChunk.trim();
    if (trimmed.length > 0) {
        chunks.push(trimmed);
    }

    return chunks;
}

/**
 * Get abbreviations list (for testing or external use)
 */
export function getAbbreviations(): string[] {
    return [...ABBREVIATIONS];
}
