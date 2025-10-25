export interface VideoGenerationProgress {
  stage: 'preparing' | 'layout' | 'recording' | 'complete';
  progress: number;
  message: string;
}

export interface VideoOptions {
  bookTitle: string;
  chapterTitle: string;
  author: string;
  enableHighlight: boolean;
  format: 'youtube' | 'mobile';
}

export interface TextLayout {
  wrappedLines: WrappedLine[];
  totalHeight: number;
}

export interface WrappedLine {
  text: string;
  y: number;
  sentence: string;
}

export interface SRTEntry {
  startTime: number;
  endTime: number;
  text: string;
}

export interface VideoConfig {
  canvasWidth: number;
  canvasHeight: number;
  fontSize: number;
  lineHeight: number;
  highlightColor: string;
  textColor: string;
  padding: number;
  scrollSpeed: number;
}
