import React from 'react';
import { Settings, X, Plus, Minus } from 'lucide-react';
import { Theme } from '../../hooks/useReaderSettings';

interface SettingsWidgetProps {
  // Settings state
  fontSize: number;
  theme: Theme;
  isSettingsOpen: boolean;
  
  // Font controls
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  
  // Theme controls
  changeTheme: (newTheme: Theme) => void;
  
  // Widget controls
  closeSettings: () => void;
}

/**
 * Floating settings widget component
 * Extracted from main Reader for better modularity
 */
export const SettingsWidget: React.FC<SettingsWidgetProps> = ({
  fontSize,
  theme,
  isSettingsOpen,
  increaseFontSize,
  decreaseFontSize,
  resetFontSize,
  changeTheme,
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
      <div className="settings-widget fixed bottom-6 right-6 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4 min-w-[280px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Reading Settings
          </h3>
          <button 
            onClick={closeSettings}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Font Size Controls */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Font Size</label>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <button 
                onClick={decreaseFontSize}
                className="p-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-white"
                aria-label="Decrease font size"
                title="Decrease font size (Ctrl/Cmd + -)"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button 
                onClick={resetFontSize}
                className="px-4 py-2 text-sm text-gray-700 hover:text-amber-800 transition-colors font-medium bg-white rounded-lg border border-gray-200 hover:border-amber-300 min-w-[4rem] text-center"
                aria-label="Reset font size"
                title="Reset font size to default (Ctrl/Cmd + 0)"
              >
                {fontSize}px
              </button>
              <button 
                onClick={increaseFontSize}
                className="p-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-white"
                aria-label="Increase font size"
                title="Increase font size (Ctrl/Cmd + +)"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Font Size Info */}
          <p className="text-xs text-gray-500 mt-2">
            Use Ctrl/Cmd + +/- to adjust quickly, or Ctrl/Cmd + 0 to reset
          </p>
        </div>
        
        {/* Theme Selection */}
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Reading Theme</label>
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
              <span className="text-xs font-medium text-gray-700">Light</span>
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
              <span className="text-xs font-medium text-gray-700">Dark</span>
            </button>
            
            <button
              onClick={() => changeTheme('sepia')}
              className={`p-3 rounded-lg border-2 transition-all ${
                theme === 'sepia' 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label="Sepia theme"
            >
              <div className="w-full h-8 bg-amber-50 rounded border border-amber-200 mb-2"></div>
              <span className="text-xs font-medium text-gray-700">Sepia</span>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Choose a comfortable reading theme for your eyes
          </p>
        </div>
      </div>
    </>
  );
};

export default SettingsWidget;
