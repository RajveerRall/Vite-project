
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ReaderSettings {
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  selectedVoice: string;
  ttsSpeed: number;
  autoContinueChapters: boolean;
}

interface ReaderSettingsContextValue extends ReaderSettings {
  setFontSize: (size: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'sepia') => void;
  setSelectedVoice: (voice: string) => void;
  setTtsSpeed: (speed: number) => void;
  setAutoContinueChapters: (auto: boolean) => void;
}

const ReaderSettingsContext = createContext<ReaderSettingsContextValue | undefined>(undefined);

export const useReaderSettingsContext = () => {
  const context = useContext(ReaderSettingsContext);
  if (!context) {
    throw new Error('useReaderSettingsContext must be used within a ReaderSettingsProvider');
  }
  return context;
};

interface ProviderProps {
  children: ReactNode;
}

export const ReaderSettingsProvider: React.FC<ProviderProps> = ({ children }) => {
  // Initialize from LocalStorage
  const [fontSize, setFontSizeState] = useState<number>(() => 
    Number(localStorage.getItem('reader-font-size')) || 18
  );
  
  const [theme, setThemeState] = useState<'light' | 'dark' | 'sepia'>(() => 
    (localStorage.getItem('reader-theme') as any) || 'light'
  );
  
  const [selectedVoice, setSelectedVoiceState] = useState<string>(() => 
    localStorage.getItem('reader-tts-voice') || 'en-US-BrianMultilingualNeural'
  );
  
  const [ttsSpeed, setTtsSpeedState] = useState<number>(() => 
    Number(localStorage.getItem('reader-tts-speed')) || 1.0
  );

  const [autoContinueChapters, setAutoContinueChaptersState] = useState<boolean>(() => 
    localStorage.getItem('reader-auto-continue') !== 'false' // Default to true
  );

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('reader-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reader-tts-voice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('reader-tts-speed', ttsSpeed.toString());
  }, [ttsSpeed]);

  useEffect(() => {
    localStorage.setItem('reader-auto-continue', autoContinueChapters.toString());
  }, [autoContinueChapters]);

  const setFontSize = (size: number) => setFontSizeState(size);
  const setTheme = (t: 'light' | 'dark' | 'sepia') => setThemeState(t);
  const setSelectedVoice = (v: string) => setSelectedVoiceState(v);
  const setTtsSpeed = (s: number) => setTtsSpeedState(s);
  const setAutoContinueChapters = (a: boolean) => setAutoContinueChaptersState(a);

  const value: ReaderSettingsContextValue = {
    fontSize,
    theme,
    selectedVoice,
    ttsSpeed,
    autoContinueChapters,
    setFontSize,
    setTheme,
    setSelectedVoice,
    setTtsSpeed,
    setAutoContinueChapters
  };

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
};
