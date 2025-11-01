// src/components/Reader/FullCastOverlay.tsx
// Loading overlay for Full Cast audiobook preparation

import React from 'react';
import { FULL_CAST_STATUS } from '../../constants/readerConstants';

export interface FullCastOverlayProps {
  isActive: boolean;
  status: string;
  buffered: number;
  hasStartedPlaying: boolean;
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
}) => {
  // Only show overlay during startup/casting/buffering before playback
  const shouldShow =
    isActive &&
    !hasStartedPlaying &&
    (status === FULL_CAST_STATUS.STARTING ||
      status === FULL_CAST_STATUS.BUFFERING ||
      status.startsWith('Casting'));

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

