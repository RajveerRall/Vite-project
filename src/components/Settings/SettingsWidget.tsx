import React from 'react';
import { Settings, X, Plus, Minus, ChevronDown } from 'lucide-react';
import { Theme } from '../../hooks/useReaderSettings';
import { getAvailableVoices } from '../../utils/voiceUtils';

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

/**
 * Floating settings widget component
 * Shared between Reader and MiniPlayer
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

  const availableVoices = getAvailableVoices();

  return (
    <>
      {/* Backdrop */}
      <div 
        className="settings-backdrop fixed inset-0 bg-black bg-opacity-30 z-[9998]"
        onClick={closeSettings}
      />
      
      {/* Settings Panel */}
      <div className={`settings-widget fixed bottom-6 right-6 rounded-lg shadow-xl border z-[9999] p-4 min-w-[280px] max-w-[90vw] theme-${theme} bg-white transition-all transform animate-in slide-in-from-bottom-4`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 settings-title text-gray-800">
            <Settings className="w-5 h-5" />
            Reading Settings
          </h3>
          <button 
            onClick={closeSettings}
            className="p-1 transition-colors settings-close-btn text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Font Size Controls */}
        <div className="space-y-3">
          <label className="block text-sm font-medium settings-label text-gray-700">Font Size</label>
          <div className="flex items-center justify-between rounded-lg p-3 settings-control-bg bg-gray-50 border border-gray-100">
            <div className="flex items-center space-x-3">
              <button 
                onClick={decreaseFontSize}
                className="p-2 transition-colors rounded-lg hover:bg-white text-gray-600 border border-transparent hover:border-gray-200"
                aria-label="Decrease font size"
                title="Decrease font size (Ctrl/Cmd + -)"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button 
                onClick={resetFontSize}
                className="px-4 py-2 text-sm transition-colors font-medium rounded-lg border border-gray-200 bg-white min-w-[4rem] text-center text-gray-700 hover:border-amber-400"
                aria-label="Reset font size"
                title="Reset font size to default (Ctrl/Cmd + 0)"
              >
                {fontSize}px
              </button>
              <button 
                onClick={increaseFontSize}
                className="p-2 transition-colors rounded-lg hover:bg-white text-gray-600 border border-transparent hover:border-gray-200"
                aria-label="Increase font size"
                title="Increase font size (Ctrl/Cmd + +)"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Font Size Info */}
          <p className="text-xs mt-2 settings-info-text text-gray-500">
            Use Ctrl/Cmd + +/- to adjust quickly, or Ctrl/Cmd + 0 to reset
          </p>
        </div>
        
        {/* Theme Selection */}
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
          <label className="block text-sm font-medium settings-label text-gray-700">Reading Theme</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => changeTheme('light')}
              className={`p-2 rounded-lg border-2 transition-all ${
                theme === 'light' 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              aria-label="Light theme"
            >
              <div className="w-full h-6 bg-white rounded border border-gray-200 mb-1"></div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Light</span>
            </button>
            
            <button
              onClick={() => changeTheme('dark')}
              className={`p-2 rounded-lg border-2 transition-all ${
                theme === 'dark' 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              aria-label="Dark theme"
            >
              <div className="w-full h-6 bg-gray-800 rounded border border-gray-600 mb-1"></div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Dark</span>
            </button>
            
            <button
              onClick={() => changeTheme('sepia')}
              className={`p-2 rounded-lg border-2 transition-all ${
                theme === 'sepia' 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              aria-label="Sepia theme"
            >
              <div className="w-full h-6 bg-[#f4ecd8] rounded border border-amber-200 mb-1"></div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Sepia</span>
            </button>
          </div>
        </div>

        {/* TTS Voice Selection */}
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
          <label htmlFor="tts-voice" className="block text-sm font-medium settings-label text-gray-700">Read Aloud Voice</label>
          <div className="relative">
            <select
              id="tts-voice"
              value={selectedVoice}
              onChange={(e) => {
                console.log(`[SettingsWidget] Voice select changed to: ${e.target.value}`);
                onVoiceChange(e.target.value);
              }}
              className="w-full appearance-none border border-gray-200 py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50 text-gray-700 text-sm"
            >
              {availableVoices.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsWidget;
