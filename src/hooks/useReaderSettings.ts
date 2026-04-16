import { useState, useCallback } from 'react';
import { useReaderSettingsContext } from '../context/ReaderSettingsContext';

/**
 * Hook to manage reader UI settings and bridge with persistent context.
 * Provides UI state (like open/close) and helper functions for 
 * fontSize manipulation and theme switching as expected by Reader/index.tsx
 */
export const useReaderSettings = () => {
  const context = useReaderSettingsContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const increaseFontSize = useCallback(() => {
    context.setFontSize(Math.min(context.fontSize + 2, 40));
  }, [context]);

  const decreaseFontSize = useCallback(() => {
    context.setFontSize(Math.max(context.fontSize - 2, 12));
  }, [context]);

  const resetFontSize = useCallback(() => {
    context.setFontSize(18);
  }, [context]);

  return {
    ...context,
    isSettingsOpen,
    toggleSettings,
    closeSettings,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    changeTheme: context.setTheme, // Alias for theme setter
  };
};