// src/components/Reader/FullCastOverlay.tsx
// Loading overlay for Full Cast audiobook preparation

import React from 'react';
import { FULL_CAST_STATUS } from '../../constants/readerConstants';

export interface FullCastOverlayProps {
  isActive: boolean;
  status: string;
  buffered: number;
  hasStartedPlaying: boolean;
  apiError?: string | null;
  onClose?: () => void;
}

/**
 * Full Cast overlay component for displaying loading/buffering state
 * Extracted from Reader component for reusability
 */
export const FullCastOverlay: React.FC<FullCastOverlayProps> = ({
  isActive,
  status,
  buffered,
  hasStartedPlaying,
  apiError,
  onClose,
}) => {
  // If there's an API error, show it even if we haven't started playing
  if (isActive && apiError) {
    return (
      <div className="simple-loading-overlay bg-black/60 backdrop-blur-md">
        <div className="simple-loading-content p-8 bg-white rounded-2xl shadow-2xl max-w-sm border border-red-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Picture Mode Error</h3>
            <p className="text-sm text-gray-500 mb-6">{apiError}</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only show overlay during startup/casting/buffering before playback
  const shouldShow =
    isActive &&
    !hasStartedPlaying &&
    (status === FULL_CAST_STATUS.STARTING ||
      status === FULL_CAST_STATUS.BUFFERING ||
      status.startsWith('Casting') ||
      status.startsWith('Preparing') ||
      status.startsWith('Generating'));

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="simple-loading-overlay">
      <div className="simple-loading-content">
        <div className="simple-spinner"></div>
        <div className="simple-text-section">
          <h3 className="simple-primary-text">Preparing Full Cast Audiobook</h3>
          <p className="simple-secondary-text">
            This may take a few minutes as we generate character voices and buffer audio.
            {status ? ` Status: ${status}` : ''}
            {buffered > 0 ? ` • Buffered: ${buffered}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

