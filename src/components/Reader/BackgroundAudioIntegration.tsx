// src/components/Reader/BackgroundAudioIntegration.tsx

import React, { useEffect, useState } from 'react';
import BackgroundAudioControls from './BackgroundAudioControls';
import { useReaderTTS } from '../../hooks/useReaderTTS';

interface BackgroundAudioIntegrationProps {
  // Your existing TTS props
  bookTitle: string;
  currentPageDisplay: number;
  currentPageText: string;
  currentContent: string;
  
  // Styling
  theme?: 'light' | 'dark' | 'sepia';
}

const BackgroundAudioIntegration: React.FC<BackgroundAudioIntegrationProps> = ({
  bookTitle,
  currentPageDisplay,
  currentPageText,
  currentContent,
  theme = 'light'
}) => {
  // Your existing TTS hook
  const ttsHook = useReaderTTS({
    bookTitle,
    currentPageDisplay,
    currentPageText,
    currentContent
  });

  const {
    chunks,
    currentChunkIndex,
    isSpeaking,
    isProcessing,
    isPaused,
    useKokoroTTS,
    handleTTS,
    handleStopTTS,
    handleTTSNavigation,
    canTTSResume,
    highlightedContent: ttsHighlightedContent
  } = ttsHook;

  // State for background audio integration
  const [showBackgroundControls, setShowBackgroundControls] = useState(false);
  const [audioUrls, setAudioUrls] = useState<string[]>([]);

  // Simulate getting audio URLs for chunks (replace with your actual TTS API)
  useEffect(() => {
    if (chunks.length > 0) {
      // This is where you'd integrate with your TTS service
      // For now, we'll create placeholder URLs
      const urls = chunks.map((_, index) => 
        `https://api.yoread.com/api/tts?text=${encodeURIComponent(chunks[index])}&voice=en-US-BrianMultilingualNeural&format=audio-24khz-48kbitrate-mono-mp3`
      );
      setAudioUrls(urls);
    }
  }, [chunks]);

  // Handle TTS state changes
  const handleTTSStateChange = (isPlaying: boolean) => {
    console.log('[BackgroundAudio] TTS state changed:', isPlaying);
    // You can sync this with your existing TTS state if needed
  };

  return (
    <div className="background-audio-integration">
      {/* Your existing TTS controls */}
      <div className="existing-tts-controls">
        <button 
          onClick={handleTTS}
          disabled={isProcessing}
          className="tts-button"
        >
          {isSpeaking ? 'Stop' : 'Start'} TTS
        </button>
        
        {isSpeaking && (
          <button onClick={handleStopTTS} className="stop-button">
            Stop
          </button>
        )}
        
        {canTTSResume && (
          <button onClick={handleTTS} className="resume-button">
            Resume
          </button>
        )}
      </div>

      {/* Background Audio Controls */}
      {chunks.length > 0 && (
        <div className="background-audio-section">
          <div className="section-header">
            <h3>Background Audio Player</h3>
            <button
              onClick={() => setShowBackgroundControls(!showBackgroundControls)}
              className="toggle-button"
            >
              {showBackgroundControls ? 'Hide' : 'Show'} Controls
            </button>
          </div>
          
          {showBackgroundControls && (
            <BackgroundAudioControls
              ttsChunks={chunks}
              ttsAudioUrls={audioUrls}
              onTTSStateChange={handleTTSStateChange}
              theme={theme}
              className="mt-4"
            />
          )}
        </div>
      )}

      {/* TTS Content Display */}
      {isSpeaking || isProcessing ? (
        <div className="tts-content">
          <h4>Currently Reading:</h4>
          <div 
            className="highlighted-content"
            dangerouslySetInnerHTML={{ __html: ttsHighlightedContent || '' }}
          />
        </div>
      ) : (
        <div className="normal-content">
          <h4>Page Content:</h4>
          <div 
            className="page-content"
            dangerouslySetInnerHTML={{ __html: currentContent }}
          />
        </div>
      )}

      {/* Debug Info */}
      <div className="debug-info">
        <h4>Debug Information:</h4>
        <ul>
          <li>Chunks: {chunks.length}</li>
          <li>Current Chunk: {currentChunkIndex}</li>
          <li>TTS State: {isSpeaking ? 'Speaking' : isProcessing ? 'Processing' : isPaused ? 'Paused' : 'Stopped'}</li>
          <li>Audio URLs: {audioUrls.length}</li>
        </ul>
      </div>
    </div>
  );
};

export default BackgroundAudioIntegration; 