// components/SimplePlayMode.tsx
import React, { useState } from 'react';

interface SimplePlayModeProps {
  currentPageContent: string;
  onClose: () => void;
}

const SimplePlayMode: React.FC<SimplePlayModeProps> = ({
  currentPageContent,
  onClose
}) => {
  // State to track if audio is playing
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Basic function to start speech synthesis
  const startSpeech = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentPageContent);
      utterance.onend = () => {
        setIsPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } else {
      alert('Speech synthesis not supported in your browser');
    }
  };
  
  // Function to stop speech
  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  return (
    <div className="simple-play-mode">
      <div className="play-mode-content">
        <div className="play-mode-header">
          <h2>Audio Player</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="play-mode-text">
          <p>{currentPageContent.slice(0, 200)}...</p>
        </div>
        
        <div className="play-mode-controls">
          {!isPlaying ? (
            <button onClick={startSpeech}>Play</button>
          ) : (
            <button onClick={stopSpeech}>Stop</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimplePlayMode;