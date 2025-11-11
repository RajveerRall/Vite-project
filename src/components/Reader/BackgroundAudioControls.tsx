// src/components/Reader/BackgroundAudioControls.tsx

import React, { useEffect, useState } from 'react';
import { useBackgroundAudio } from '../../hooks/useBackgroundAudio';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Settings, Lock } from 'lucide-react';

interface BackgroundAudioControlsProps {
  // TTS integration
  ttsChunks: string[];
  ttsAudioUrls: string[];
  onTTSStateChange?: (isPlaying: boolean) => void;
  
  // Styling
  className?: string;
  theme?: 'light' | 'dark' | 'sepia';
}

const BackgroundAudioControls: React.FC<BackgroundAudioControlsProps> = ({
  ttsChunks,
  ttsAudioUrls,
  onTTSStateChange,
  className = '',
  theme = 'light'
}) => {
  const {
    // State
    isPlaying,
    isPaused,
    currentChunkIndex,
    totalChunks,
    currentTime,
    totalDuration,
    playbackRate,
    
    // Controls
    play,
    pause,
    resume,
    stop,
    skipToChunk,
    setPlaybackRate,
    setVolume,
    
    // Audio management
    setAudioChunks,
    clearAudioChunks,
    
    // Background features
    enableBackgroundPlayback,
    requestNotificationPermission
  } = useBackgroundAudio();

  const [showSettings, setShowSettings] = useState(false);
  const [uiVolume, setUiVolume] = useState(1.0);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);

  // Sync TTS chunks with background audio
  useEffect(() => {
    if (ttsChunks.length > 0 && ttsAudioUrls.length > 0) {
      setAudioChunks(ttsChunks, ttsAudioUrls);
    }
  }, [ttsChunks, ttsAudioUrls, setAudioChunks]);

  // Notify parent component of TTS state changes
  useEffect(() => {
    onTTSStateChange?.(isPlaying);
  }, [isPlaying, onTTSStateChange]);

  // Handle play/pause
  const handlePlayPause = async () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      await resume();
    } else {
      await play();
    }
  };

  // Handle skip to previous chunk
  const handlePrevious = async () => {
    if (currentChunkIndex > 0) {
      await skipToChunk(currentChunkIndex - 1);
    }
  };

  // Handle skip to next chunk
  const handleNext = async () => {
    if (currentChunkIndex < totalChunks - 1) {
      await skipToChunk(currentChunkIndex + 1);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setUiVolume(newVolume);
    setVolume(newVolume);
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
  };

  // Enable background playback
  const handleEnableBackground = async () => {
    try {
      await requestNotificationPermission();
      await enableBackgroundPlayback();
      setBackgroundEnabled(true);
    } catch (error) {
      console.error('Failed to enable background playback:', error);
    }
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get progress percentage
  const getProgress = (): number => {
    if (totalDuration === 0) return 0;
    return (currentTime / totalDuration) * 100;
  };

  return (
    <div className={`background-audio-controls theme-${theme} ${className}`}>
      {/* Main Controls */}
      <div className="controls-main">
        <button
          onClick={handlePrevious}
          disabled={currentChunkIndex === 0}
          className="control-btn previous-btn"
          aria-label="Previous chunk"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={handlePlayPause}
          className="control-btn play-pause-btn"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={currentChunkIndex === totalChunks - 1}
          className="control-btn next-btn"
          aria-label="Next chunk"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={stop}
          className="control-btn stop-btn"
          aria-label="Stop"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-info">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="chunk-info">
            {currentChunkIndex + 1} / {totalChunks}
          </span>
          <span className="total-time">{formatTime(totalDuration)}</span>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      </div>

      {/* Volume Control */}
      <div className="volume-control">
        <Volume2 className="w-4 h-4" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={uiVolume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="volume-slider"
        />
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="control-btn settings-btn"
        aria-label="Audio settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Background Playback Toggle */}
      <button
        onClick={handleEnableBackground}
        disabled={backgroundEnabled}
        className={`control-btn background-btn ${backgroundEnabled ? 'enabled' : ''}`}
        aria-label="Enable background playback"
        title={backgroundEnabled ? 'Background playback enabled' : 'Enable background playback'}
      >
        <Lock className="w-4 h-4" />
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="setting-group">
            <label htmlFor="playback-rate">Playback Speed:</label>
            <select
              id="playback-rate"
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              className="setting-select"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>
          </div>

          <div className="setting-group">
            <label htmlFor="chunk-skip">Chunk Skip:</label>
            <div className="chunk-skip-controls">
              <button
                onClick={() => skipToChunk(Math.max(0, currentChunkIndex - 5))}
                className="skip-btn"
                disabled={currentChunkIndex < 5}
              >
                -5
              </button>
              <button
                onClick={() => skipToChunk(Math.min(totalChunks - 1, currentChunkIndex + 5))}
                className="skip-btn"
                disabled={currentChunkIndex >= totalChunks - 5}
              >
                +5
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label>Background Features:</label>
            <div className="feature-status">
              <span className={`status ${backgroundEnabled ? 'enabled' : 'disabled'}`}>
                {backgroundEnabled ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundAudioControls; 