// processTextWithCompromise.ts
import nlp from 'compromise';

export interface ParsedSegment {
  speaker: string;
  text: string;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  voice: string; // To be filled in later after voice assignment
}

/**
 * Splits the text into sentences using compromise.
 * If a sentence contains quotation marks, it is marked as dialogue.
 * Otherwise, it is considered narration.
 */
export function processTextWithCompromise(text: string): ParsedSegment[] {
  // Use compromise to split text into sentences.
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');

  const segments: ParsedSegment[] = sentences.map((sentence: string) => {
    // If the sentence contains a quote, treat it as dialogue.
    if (sentence.includes('"')) {
      // Remove quotes for clarity.
      const cleaned = sentence.replace(/"/g, '').trim();
      return {
        speaker: "DialogueSpeaker", // Placeholder—later logic can refine this.
        text: cleaned,
        gender: "UNKNOWN",
        voice: ""
      };
    } else {
      // Treat as narration.
      return {
        speaker: "Narrator",
        text: sentence.trim(),
        gender: "UNKNOWN",
        voice: ""
      };
    }
  });

  return segments;
}
