// useTts.js
import { useState, useEffect, useCallback } from 'react';
import ttsService from './ClientTtsService';

const useTts = () => {
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  // Initialize the TTS service
  useEffect(() => {
    const initTts = async () => {
      try {
        const initialized = await ttsService.initialize();
        setIsReady(initialized);
      } catch (err) {
        setError('Failed to initialize TTS engine');
        console.error(err);
      }
    };

    initTts();
  }, []);

  // Set voice mapping
  const setVoiceMapping = useCallback((voiceMapping) => {
    ttsService.setVoiceMapping(voiceMapping);
  }, []);

  // Speak text
  const speak = useCallback(async (text, speaker, gender) => {
    if (!isReady) {
      setError('TTS engine not ready yet');
      return false;
    }

    try {
      setIsSpeaking(true);
      await ttsService.speak(text, speaker, gender);
      return true;
    } catch (err) {
      setError(`Speech error: ${err.message}`);
      return false;
    } finally {
      setIsSpeaking(false);
    }
  }, [isReady]);

  // Stop speaking
  const stop = useCallback(() => {
    ttsService.stop();
    setIsSpeaking(false);
  }, []);

  return {
    isReady,
    isSpeaking,
    error,
    speak,
    stop,
    setVoiceMapping
  };
};

export default useTts;
