// src/hooks/useTextToSpeech.ts
import { useState, useEffect, useCallback } from 'react';

interface TextToSpeechOptions {
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice | null;
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available voices when component mounts
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    // Function to get voices
    const getVoices = () => {
      const voiceList = window.speechSynthesis.getVoices();
      setVoices(voiceList);
    };

    // Get voices on initial load
    getVoices();

    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = getVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Start speaking a text
  const speak = useCallback((text: string, options: TextToSpeechOptions = {}) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create a new utterance
    const newUtterance = new SpeechSynthesisUtterance(text);
    
    // Apply options
    if (options.rate) newUtterance.rate = options.rate;
    if (options.pitch) newUtterance.pitch = options.pitch;
    if (options.voice) newUtterance.voice = options.voice;

    // Set event handlers
    newUtterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    newUtterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setUtterance(null);
    };

    newUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
      setUtterance(null);
    };

    // Store the utterance in state
    setUtterance(newUtterance);

    // Start speaking
    window.speechSynthesis.speak(newUtterance);
  }, []);

  // Pause the speech
  const pause = useCallback(() => {
    if (!('speechSynthesis' in window) || !isSpeaking || isPaused) {
      return;
    }

    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSpeaking, isPaused]);

  // Resume the speech
  const resume = useCallback(() => {
    if (!('speechSynthesis' in window) || !isSpeaking || !isPaused) {
      return;
    }

    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSpeaking, isPaused]);

  // Stop the speech
  const stop = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setUtterance(null);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    voices,
    supported: 'speechSynthesis' in window
  };
}
