// Video Quote Generator Types

export interface VideoQuoteOptions {
  text: string;
  bookTitle: string;
  author: string;
  voice: string;
  backgroundTemplate: BackgroundTemplate;
  coverUrl?: string | null;
}

export interface BackgroundTemplate {
  id: string;
  name: string;
  type: 'gradient' | 'torn-cover';
  gradient?: string; // Optional for gradients
  preview?: string; // Optional preview
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  index: number;
}

export interface SRTEntry {
  index: number;
  startTime: number;  // in seconds
  endTime: number;    // in seconds
  text: string;
}

export interface VideoGenerationProgress {
  stage: 'audio' | 'timing' | 'rendering' | 'recording' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface VideoQuoteResult {
  videoBlob: Blob;
  duration: number;
  wordTimestamps: WordTimestamp[];
  audioBlob: Blob;
}

export interface VideoQuoteGeneratorConfig {
  canvasWidth: number;
  canvasHeight: number;
  fontSize: number;
  lineHeight: number;
  highlightColor: string;
  textColor: string;
  attributionFontSize: number;
  maxWordsPerLine: number;
  padding: number;
}
