import { useState, useCallback, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';

export interface UseReaderSettingsReturn {
  // Settings state
  fontSize: number;
  theme: Theme;
  isSettingsOpen: boolean;
  
  // Font size controls
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  
  // Theme controls
  changeTheme: (newTheme: Theme) => void;
  
  // TTS Settings
  selectedVoice: string;
  ttsSpeed: number;
  autoContinueChapters: boolean;
  
  // TTS Controls
  setSelectedVoice: (voice: string) => void;
  setTtsSpeed: (speed: number) => void;
  setAutoContinueChapters: (enabled: boolean) => void;
  
  // Settings widget controls
  toggleSettings: () => void;
  closeSettings: () => void;
}

/**
 * Custom hook for managing reader settings (font size, theme, TTS, settings widget)
 * Handles localStorage persistence and keyboard shortcuts automatically
 */
export const useReaderSettings = (): UseReaderSettingsReturn => {
  // Font size state - persisted in localStorage
  const [fontSize, setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem('reader-font-size');
    return savedFontSize ? parseInt(savedFontSize, 10) : 16; // Default 16px
  });
  
  // Theme state - persisted in localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('reader-theme') as Theme;
    return savedTheme || 'light'; // Default to light theme
  });
  
  // TTS Voice state - persisted in localStorage
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    const savedVoice = localStorage.getItem('reader-tts-voice');
    return savedVoice || 'en-US-BrianMultilingualNeural'; // Default voice
  });
  
  // TTS Speed state - persisted in localStorage
  const [ttsSpeed, setTtsSpeed] = useState<number>(() => {
    const savedSpeed = localStorage.getItem('reader-tts-speed');
    return savedSpeed ? parseFloat(savedSpeed) : 1; // Default 1x speed
  });
  
  // Auto-continue chapters state - persisted in localStorage
  const [autoContinueChapters, setAutoContinueChapters] = useState<boolean>(() => {
    const saved = localStorage.getItem('reader-auto-continue-chapters');
    return saved !== null ? saved === 'true' : true; // Default true
  });
  
  // Settings widget state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Font size adjustment functions
  const increaseFontSize = useCallback(() => {
    setFontSize(prev => {
      const newSize = Math.min(prev + 2, 24); // Max 24px
      localStorage.setItem('reader-font-size', newSize.toString());
      return newSize;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => {
      const newSize = Math.max(prev - 2, 12); // Min 12px
      localStorage.setItem('reader-font-size', newSize.toString());
      return newSize;
    });
  }, []);

  const resetFontSize = useCallback(() => {
    const defaultSize = 16;
    setFontSize(defaultSize);
    localStorage.setItem('reader-font-size', defaultSize.toString());
  }, []);

  // Theme management functions
  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('reader-theme', newTheme);
  }, []);

  // TTS Voice management function
  const handleVoiceChange = useCallback((voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('reader-tts-voice', voice);
  }, []);

  // TTS Speed management function
  const handleSpeedChange = useCallback((speed: number) => {
    setTtsSpeed(speed);
    localStorage.setItem('reader-tts-speed', speed.toString());
  }, []);
  
  // Auto-continue chapters management function
  const handleAutoContinueChange = useCallback((enabled: boolean) => {
    setAutoContinueChapters(enabled);
    localStorage.setItem('reader-auto-continue-chapters', enabled.toString());
  }, []);

  // Settings widget control functions
  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Keyboard shortcuts for font size adjustment and settings
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close settings with ESC key
      if (event.key === 'Escape' && isSettingsOpen) {
        event.preventDefault();
        closeSettings();
        return;
      }

      // Only trigger font shortcuts if not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + Plus/Equal for increase font size
      if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        increaseFontSize();
      }
      // Ctrl/Cmd + Minus for decrease font size
      else if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        decreaseFontSize();
      }
      // Ctrl/Cmd + 0 for reset font size
      else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault();
        resetFontSize();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [increaseFontSize, decreaseFontSize, resetFontSize, isSettingsOpen, closeSettings]);

  return {
    // State
    fontSize,
    theme,
    isSettingsOpen,
    selectedVoice,
    ttsSpeed,
    autoContinueChapters,
    
    // Font controls
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    
    // Theme controls
    changeTheme,
    
    // TTS controls
    setSelectedVoice: handleVoiceChange,
    setTtsSpeed: handleSpeedChange,
    setAutoContinueChapters: handleAutoContinueChange,
    
    // Settings widget
    toggleSettings,
    closeSettings,
  };
};