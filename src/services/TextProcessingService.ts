// // TextProcessingService.ts
// import { TextChunk, TextUpdateCallback, ProcessingCompleteCallback, ErrorCallback } from '../types/TextProcessingTypes';

// export class TextProcessingService {
//   private chunks: TextChunk[] = [];
//   private currentChunkIndex: number = 0;
//   private onTextUpdate: TextUpdateCallback | null = null;
//   private onProcessingComplete: ProcessingCompleteCallback | null = null;
//   private onError: ErrorCallback | null = null;
  
//   /**
//    * Process the full text into manageable chunks
//    */
//   public processText(text: string, chunkSize: number = 200): TextChunk[] {
//     const words = text.split(' ');
//     const chunks: TextChunk[] = [];
    
//     let currentChunk = '';
//     let chunkId = 0;
    
//     for (const word of words) {
//       if ((currentChunk + ' ' + word).length <= chunkSize) {
//         currentChunk += (currentChunk ? ' ' : '') + word;
//       } else {
//         chunks.push({
//           id: chunkId++,
//           text: currentChunk,
//           isProcessed: false,
//           isPlaying: false
//         });
//         currentChunk = word;
//       }
//     }
    
//     // Add the last chunk if it's not empty
//     if (currentChunk) {
//       chunks.push({
//         id: chunkId,
//         text: currentChunk,
//         isProcessed: false,
//         isPlaying: false
//       });
//     }
    
//     this.chunks = chunks;
//     this.currentChunkIndex = 0;
    
//     return [...this.chunks];
//   }
  
//   /**
//    * Set callbacks for the service
//    */
//   public setCallbacks(
//     onTextUpdate: TextUpdateCallback,
//     onProcessingComplete: ProcessingCompleteCallback,
//     onError: ErrorCallback
//   ): void {
//     this.onTextUpdate = onTextUpdate;
//     this.onProcessingComplete = onProcessingComplete;
//     this.onError = onError;
//   }
  
//   /**
//    * Get text from a specific chunk index to the end
//    */
//   public getTextFromChunk(chunkIndex: number): string {
//     if (chunkIndex >= this.chunks.length) {
//       return '';
//     }
    
//     return this.chunks
//       .slice(chunkIndex)
//       .map(chunk => chunk.text)
//       .join(' ');
//   }
  
//   /**
//    * Update the status of a specific chunk
//    */
//   public updateChunkStatus(chunkIndex: number, isPlaying: boolean): TextChunk[] {
//     if (chunkIndex >= this.chunks.length) {
//       return [...this.chunks];
//     }
    
//     const updatedChunks = this.chunks.map((chunk, index) => ({
//       ...chunk,
//       isProcessed: index < chunkIndex,
//       isPlaying: index === chunkIndex ? isPlaying : false
//     }));
    
//     this.chunks = updatedChunks;
//     this.currentChunkIndex = chunkIndex;
    
//     return [...this.chunks];
//   }
  
//   /**
//    * Process incoming text from the TTS service to find the current chunk
//    */
//   public processIncomingText(text: string): number {
//     const chunkIndex = this.findChunkForText(text);
    
//     if (chunkIndex !== -1 && chunkIndex !== this.currentChunkIndex) {
//       this.updateChunkStatus(chunkIndex, true);
//       this.currentChunkIndex = chunkIndex;
      
//       if (this.onTextUpdate) {
//         this.onTextUpdate(text, chunkIndex);
//       }
//     }
    
//     return chunkIndex;
//   }
  
//   /**
//    * Find which chunk contains the given text
//    */
//   private findChunkForText(text: string): number {
//     // This is a simplistic approach - in a real implementation, you might need
//     // more sophisticated text matching
//     for (let i = 0; i < this.chunks.length; i++) {
//       if (this.chunks[i].text.includes(text.substring(0, 20))) {
//         return i;
//       }
//     }
//     return -1;
//   }
  
//   /**
//    * Mark all chunks as processed (for completion)
//    */
//   public markAllChunksAsProcessed(): TextChunk[] {
//     const updatedChunks = this.chunks.map(chunk => ({
//       ...chunk,
//       isProcessed: true,
//       isPlaying: false
//     }));
    
//     this.chunks = updatedChunks;
    
//     return [...this.chunks];
//   }
  
//   /**
//    * Reset all chunks (for stopping playback)
//    */
//   public resetChunks(): TextChunk[] {
//     const updatedChunks = this.chunks.map(chunk => ({
//       ...chunk,
//       isProcessed: false,
//       isPlaying: false
//     }));
    
//     this.chunks = updatedChunks;
//     this.currentChunkIndex = 0;
    
//     return [...this.chunks];
//   }
  
//   /**
//    * Get current text for display
//    */
//   public getDisplayText(isPaused: boolean): string {
//     // Combine all processed chunks and the current one if playing
//     const displayChunks = this.chunks
//       .filter((chunk, index) => 
//         index < this.currentChunkIndex || 
//         (index === this.currentChunkIndex && !isPaused))
//       .map(chunk => chunk.text);
    
//     return displayChunks.join(' ');
//   }
  
//   /**
//    * Get the number of chunks
//    */
//   public getChunkCount(): number {
//     return this.chunks.length;
//   }
  
//   /**
//    * Get the current chunk index
//    */
//   public getCurrentChunkIndex(): number {
//     return this.currentChunkIndex;
//   }
// }



// TextProcessingService.ts
import { TextChunk, TextUpdateCallback, ProcessingCompleteCallback, ErrorCallback } from '../types/TextProcessingTypes';

export class TextProcessingService {
  private chunks: TextChunk[] = [];
  private currentChunkIndex: number = 0;
  private onTextUpdate: TextUpdateCallback | null = null;
  private onProcessingComplete: ProcessingCompleteCallback | null = null;
  private onError: ErrorCallback | null = null;
  private processedText: string = '';
  private processedChunks = new Set<string>();
  
  /**
   * Process the full text into manageable chunks
   */
  public processText(text: string, chunkSize: number = 200): TextChunk[] {
    const words = text.split(' ');
    const chunks: TextChunk[] = [];
    
    let currentChunk = '';
    let chunkId = 0;
    
    for (const word of words) {
      if ((currentChunk + ' ' + word).length <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        chunks.push({
          id: chunkId++,
          text: currentChunk,
          isProcessed: false,
          isPlaying: false
        });
        currentChunk = word;
      }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk) {
      chunks.push({
        id: chunkId,
        text: currentChunk,
        isProcessed: false,
        isPlaying: false
      });
    }
    
    this.chunks = chunks;
    this.currentChunkIndex = 0;
    this.processedText = '';
    this.processedChunks.clear();
    
    console.log("Created chunks:", chunks.length);
    
    return [...this.chunks];
  }
  
// TextProcessingService.ts - updated handleTTSChunk method

// /**
//  * Handle a new text-audio chunk from the TTS service
//  */
// public handleTTSChunk(text: string): void {
//     // The problem is that every chunk's ID is being computed the same way
//     // Let's use the entire text content instead as a unique identifier
//     const chunkId = text.trim();
    
//     console.log("Received text chunk:", text);
    
//     // Only process if we haven't seen this exact chunk before
//     if (!this.processedChunks.has(chunkId)) {
//       console.log("Processing new chunk");
//       this.processedChunks.add(chunkId);
      
//       // Adding unique text to processed text
//       this.processedText += text + " ";
//       console.log("Updated processed text length:", this.processedText.length);
      
//       // Find which chunk we're currently processing
//       this.updateChunkFromProcessedText();
      
//       // Notify listeners
//       if (this.onTextUpdate) {
//         this.onTextUpdate(this.processedText, this.currentChunkIndex);
//       }
//     } else {
//       console.log("Skipping duplicate chunk");
//     }
//   }


// TextProcessingService.ts - updated handleTTSChunk method

    /**
     * Handle a new text-audio chunk from the TTS service
     */
    public handleTTSChunk(text: string): void {
        // Now each chunk contains just the new text, not accumulated text
        console.log("Processing text chunk:", text);
        
        // Add this text to our accumulated text
        this.processedText += text + " ";
        console.log("Updated processed text length:", this.processedText.length);
        
        // Find which chunk we're currently processing
        this.updateChunkFromProcessedText();
        
        // Notify listeners
        if (this.onTextUpdate) {
        this.onTextUpdate(this.processedText, this.currentChunkIndex);
        }
    }
  
  /**
   * Update the current chunk based on the processed text
   */
  private updateChunkFromProcessedText(): void {
    // Count how many chunks we've fully processed
    let totalTextLength = 0;
    let newChunkIndex = 0;
    
    for (let i = 0; i < this.chunks.length; i++) {
      totalTextLength += this.chunks[i].text.length + 1; // +1 for space
      
      if (totalTextLength > this.processedText.length) {
        newChunkIndex = i;
        break;
      }
      newChunkIndex = i + 1;
    }
    
    if (newChunkIndex !== this.currentChunkIndex) {
      console.log("Updating chunk index from", this.currentChunkIndex, "to", newChunkIndex);
      this.updateChunkStatus(newChunkIndex, true);
    }
  }
  
  /**
   * Get the current processed text
   */
  public getProcessedText(): string {
    return this.processedText;
  }
  
  /**
   * Set callbacks for the service
   */
  public setCallbacks(
    onTextUpdate: TextUpdateCallback,
    onProcessingComplete: ProcessingCompleteCallback,
    onError: ErrorCallback
  ): void {
    this.onTextUpdate = onTextUpdate;
    this.onProcessingComplete = onProcessingComplete;
    this.onError = onError;
  }
  
  /**
   * Get text from a specific chunk index to the end
   */
  public getTextFromChunk(chunkIndex: number): string {
    if (chunkIndex >= this.chunks.length) {
      return '';
    }
    
    return this.chunks
      .slice(chunkIndex)
      .map(chunk => chunk.text)
      .join(' ');
  }
  
  /**
   * Update the status of a specific chunk
   */
  public updateChunkStatus(chunkIndex: number, isPlaying: boolean): TextChunk[] {
    if (chunkIndex >= this.chunks.length) {
      return [...this.chunks];
    }
    
    const updatedChunks = this.chunks.map((chunk, index) => ({
      ...chunk,
      isProcessed: index < chunkIndex,
      isPlaying: index === chunkIndex ? isPlaying : false
    }));
    
    this.chunks = updatedChunks;
    this.currentChunkIndex = chunkIndex;
    
    return [...this.chunks];
  }
  
  /**
   * Reset processed text (for pausing/stopping)
   */
  public resetProcessedText(upToChunk: number = 0): void {
    this.processedChunks.clear();
    
    if (upToChunk === 0) {
      this.processedText = '';
    } else {
      // Keep text up to the specified chunk
      this.processedText = this.chunks
        .slice(0, upToChunk)
        .map(chunk => chunk.text)
        .join(' ');
      
      // Add these chunks to processed set
      this.chunks.slice(0, upToChunk).forEach(chunk => {
        this.processedChunks.add(chunk.text.substring(0, 20));
      });
    }
    
    console.log("Reset processed text to length:", this.processedText.length);
  }
  
  /**
   * Mark all chunks as processed (for completion)
   */
  public markAllChunksAsProcessed(): TextChunk[] {
    const updatedChunks = this.chunks.map(chunk => ({
      ...chunk,
      isProcessed: true,
      isPlaying: false
    }));
    
    this.chunks = updatedChunks;
    
    // Set processed text to all text
    this.processedText = this.chunks.map(chunk => chunk.text).join(' ');
    
    // Add all chunks to processed set
    this.chunks.forEach(chunk => {
      this.processedChunks.add(chunk.text.substring(0, 20));
    });
    
    return [...this.chunks];
  }
  
  /**
   * Reset all chunks (for stopping playback)
   */
  public resetChunks(): TextChunk[] {
    const updatedChunks = this.chunks.map(chunk => ({
      ...chunk,
      isProcessed: false,
      isPlaying: false
    }));
    
    this.chunks = updatedChunks;
    this.currentChunkIndex = 0;
    this.processedText = '';
    this.processedChunks.clear();
    
    return [...this.chunks];
  }
  
  /**
   * Get the number of chunks
   */
  public getChunkCount(): number {
    return this.chunks.length;
  }
  
  /**
   * Get the current chunk index
   */
  public getCurrentChunkIndex(): number {
    return this.currentChunkIndex;
  }
}