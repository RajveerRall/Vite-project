// src/components/Reader/SimplePlayMode.tsx
import React, { useState, useEffect } from 'react';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import './SimplePlayMode.css';

interface SimplePlayModeProps {
  currentPageContent: string;
  onClose: () => void;
}

const SimplePlayMode: React.FC<SimplePlayModeProps> = ({
  currentPageContent,
  onClose
}) => {
  // Use our TTS hook
  const { speak, stop, isSpeaking, voices } = useTextToSpeech();
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState<number>(1);
  
  // Find a default voice on component mount
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      // Try to find a female English voice first
      const femaleVoice = voices.find(
        voice => voice.lang.startsWith('en') && voice.name.includes('Female')
      );
      
      // Then try any English voice
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
      
      // Set the selected voice
      setSelectedVoice(femaleVoice || englishVoice || voices[0]);
    }
  }, [voices, selectedVoice]);
  
  // Start speech with the current settings
  const startSpeech = () => {
    speak(currentPageContent, { 
      voice: selectedVoice,
      rate 
    });
  };
  
  // Handle voice selection
  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceURI = event.target.value;
    const voice = voices.find(v => v.voiceURI === voiceURI) || null;
    setSelectedVoice(voice);
  };
  
  // Handle rate change
  const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRate(parseFloat(event.target.value));
  };
  
  // Clear speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <div className="simple-play-mode">
      <div className="play-mode-content">
        <div className="play-mode-header">
          <h2>Audio Player</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="play-mode-controls">
          <div className="control-group">
            <label htmlFor="voice-select">Voice:</label>
            <select 
              id="voice-select" 
              value={selectedVoice?.voiceURI || ''}
              onChange={handleVoiceChange}
            >
              {voices.map(voice => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label htmlFor="rate-slider">Speed: {rate.toFixed(1)}x</label>
            <input
              type="range"
              id="rate-slider"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={handleRateChange}
            />
          </div>
          
          <div className="button-group">
            {!isSpeaking ? (
              <button onClick={startSpeech} className="play-button">Play</button>
            ) : (
              <button onClick={stop} className="stop-button">Stop</button>
            )}
          </div>
        </div>
        
        <div className="play-mode-text">
          <p className="content-preview">{currentPageContent.slice(0, 300)}...</p>
          <p className="instruction-text">
            {isSpeaking 
              ? "Reading text aloud..." 
              : "Click Play to start reading text aloud"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimplePlayMode;