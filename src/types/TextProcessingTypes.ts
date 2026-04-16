// TextProcessingTypes.ts

// Text chunk interface
export interface TextChunk {
    id: number;
    text: string;
    isProcessed: boolean;
    isPlaying: boolean;
  }
  
  // Callbacks for text processing
  export type TextUpdateCallback = (text: string, chunkIndex: number) => void;
  export type ProcessingCompleteCallback = () => void;
  export type ErrorCallback = (error: string) => void;