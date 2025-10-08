import React, { useEffect, useState } from 'react';
import SupabaseGoogleButton from './SupabaseGoogleButton';

interface FloatingGooglePromptProps {
  onSuccess?: () => void;
}

const STORAGE_KEY = 'yoread_google_prompt_dismissed';

const FloatingGooglePrompt: React.FC<FloatingGooglePromptProps> = ({ onSuccess }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY) === '1';
    if (!dismissed) {
      const t = setTimeout(() => setVisible(true), 600); // slight delay after load
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white border border-gray-200 shadow-xl rounded-lg p-4 w-80">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Sign in to save progress</h3>
            <p className="text-xs text-gray-600 mt-1">Use Google to sync your library and listening progress.</p>
          </div>
          <button
            onClick={() => { sessionStorage.setItem(STORAGE_KEY, '1'); setVisible(false); }}
            className="ml-3 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
            title="Dismiss"
          >
            ×
          </button>
        </div>
        <div className="mt-3">
          <SupabaseGoogleButton onSuccess={onSuccess} onError={() => {}} />
        </div>
      </div>
    </div>
  );
};

export default FloatingGooglePrompt;


