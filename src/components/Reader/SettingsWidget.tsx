import React from 'react';
import { Settings, X, Plus, Minus, ChevronDown } from 'lucide-react';
import { Theme } from '../../hooks/useReaderSettings';

interface SettingsWidgetProps {
  // Settings state
  fontSize: number;
  theme: Theme;
  isSettingsOpen: boolean;
  selectedVoice: string;
  
  // Font controls
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  
  // Theme controls
  changeTheme: (newTheme: Theme) => void;
  
  // TTS controls
  onVoiceChange: (voice: string) => void;
  
  // Widget controls
  closeSettings: () => void;
}

const availableVoices = [
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava (F)' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (F)' },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian (M)' },
  { id: 'en-US-AndrewNeural', name: 'Andrew (M)' },
];

/**
 * Floating settings widget component
 * Extracted from main Reader for better modularity
 */
export const SettingsWidget: React.FC<SettingsWidgetProps> = ({
  fontSize,
  theme,
  isSettingsOpen,
  selectedVoice,
  increaseFontSize,
  decreaseFontSize,
  resetFontSize,
  changeTheme,
  onVoiceChange,
  closeSettings,
}) => {
  if (!isSettingsOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="settings-backdrop fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={closeSettings}
      />
      
      {/* Settings Panel */}
      <div className={`settings-widget fixed bottom-6 right-6 rounded-lg shadow-xl border z-50 p-4 min-w-[280px] max-w-[90vw] theme-${theme}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 settings-title">
            <Settings className="w-5 h-5" />
            Reading Settings
          </h3>
          <button 
            onClick={closeSettings}
            className="p-1 transition-colors settings-close-btn"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Font Size Controls */}
        <div className="space-y-3">
          <label className="block text-sm font-medium settings-label">Font Size</label>
          <div className="flex items-center justify-between rounded-lg p-3 settings-control-bg">
            <div className="flex items-center space-x-3">
              <button 
                onClick={decreaseFontSize}
                className="p-2 transition-colors rounded-lg hover:bg-white settings-control-btn"
                aria-label="Decrease font size"
                title="Decrease font size (Ctrl/Cmd + -)"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button 
                onClick={resetFontSize}
                className="px-4 py-2 text-sm transition-colors font-medium rounded-lg border min-w-[4rem] text-center settings-reset-btn"
                aria-label="Reset font size"
                title="Reset font size to default (Ctrl/Cmd + 0)"
              >
                {fontSize}px
              </button>
              <button 
                onClick={increaseFontSize}
                className="p-2 transition-colors rounded-lg hover:bg-white settings-control-btn"
                aria-label="Increase font size"
                title="Increase font size (Ctrl/Cmd + +)"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Font Size Info */}
          <p className="text-xs mt-2 settings-info-text">
            Use Ctrl/Cmd + +/- to adjust quickly, or Ctrl/Cmd + 0 to reset
          </p>
        </div>
        
        {/* Theme Selection */}
        <div className="border-t pt-4 mt-4 space-y-3 settings-section-border">
          <label className="block text-sm font-medium settings-label">Reading Theme</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => changeTheme('light')}
              className={`p-3 rounded-lg border-2 transition-all ${
                theme === 'light' 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label="Light theme"
            >
              <div className="w-full h-8 bg-white rounded border border-gray-200 mb-2"></div>
              <span className="text-xs font-medium settings-theme-text">Light</span>
            </button>
            
            <button
              onClick={() => changeTheme('dark')}
              className={`p-3 rounded-lg border-2 transition-all ${
                theme === 'dark' 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label="Dark theme"
            >
              <div className="w-full h-8 bg-gray-800 rounded border border-gray-600 mb-2"></div>
              <span className="text-xs font-medium settings-theme-text">Dark</span>
            </button>
            
            <button
              onClick={() => changeTheme('sepia')}
              className={`p-3 rounded-lg border-2 transition-all ${
                theme === 'light' 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label="Sepia theme"
            >
              <div className="w-full h-8 bg-amber-50 rounded border border-amber-200 mb-2"></div>
              <span className="text-xs font-medium settings-theme-text">Sepia</span>
            </button>
          </div>
          <p className="text-xs settings-info-text">
            Choose a comfortable reading theme for your eyes
          </p>
        </div>

        {/* TTS Voice Selection */}
        <div className="border-t pt-4 mt-4 space-y-3 settings-section-border">
          <label htmlFor="tts-voice" className="block text-sm font-medium settings-label">Read Aloud Voice</label>
          <div className="relative">
            <select
              id="tts-voice"
              value={selectedVoice}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="w-full appearance-none border py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:border-amber-400 settings-select"
            >
              {availableVoices.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 settings-select-icon">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>


      </div>
    </>
  );
};

export default SettingsWidget;
