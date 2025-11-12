// src/components/Reader/ReaderControlsContainer.tsx
// Container component for Controls that handles mobile/desktop variants
// Eliminates code duplication from having Controls rendered twice

import React from 'react';
import { trackEvent } from '../../lib/analytics';
import Controls, { ControlsProps } from './Controls';

export interface ReaderControlsContainerProps extends ControlsProps {
  // These are already in ControlsProps, but we document them here for clarity
  fullCastStatus: string;
  fullCastBuffered: number;
}

/**
 * Container component for Controls that handles mobile vs desktop rendering
 * Wraps the Controls component and eliminates duplication
 */
export const ReaderControlsContainer: React.FC<ReaderControlsContainerProps> = ({
  onFullCastStop,
  onFullCastPause,
  onFullCastResume,
  fullCastStatus,
  fullCastBuffered,
  ...controlsProps
}) => {
  // Create handlers that include analytics tracking
  const handleFullCastStop = () => {
    trackEvent('full_cast_stop', {
      status: fullCastStatus,
      buffered: fullCastBuffered,
    });
    onFullCastStop();
  };

  const handleFullCastPause = () => {
    trackEvent('full_cast_pause', {
      status: fullCastStatus,
      buffered: fullCastBuffered,
    });
    // onFullCastPause();
  };

  const handleFullCastResume = () => {
    trackEvent('full_cast_resume', {
      status: fullCastStatus,
      buffered: fullCastBuffered,
    });
    // onFullCastResume();
  };

  return (
    <>
      {/* Mobile Controls */}
      <div className="reader-bottom-controls fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-lg z-30 md:hidden">
        <div className="px-4 py-3">
          <Controls
            {...controlsProps}
            onFullCastStop={handleFullCastStop}
            onFullCastPause={handleFullCastPause}
            onFullCastResume={handleFullCastResume}
          />
        </div>
      </div>

      {/* Desktop Controls */}
      <div className="reader-bottom-controls-desktop hidden md:block fixed bottom-6 left-1/2 transform -translate-x-1/2 rounded-full shadow-xl border border-gray-200 z-30">
        <div className="px-6 py-3">
          <Controls
            {...controlsProps}
            onFullCastStop={handleFullCastStop}
            onFullCastPause={handleFullCastPause}
            onFullCastResume={handleFullCastResume}
          />
        </div>
      </div>
    </>
  );
};

