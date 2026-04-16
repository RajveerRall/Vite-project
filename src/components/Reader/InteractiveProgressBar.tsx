import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useSmoothProgress } from '../../hooks/tts/useSmoothProgress';
import { useThrottle } from '../../hooks/useThrottle';

interface InteractiveProgressBarProps {
  progress: number; // Current TTS position (0-100)
  onPreview: (percentage: number) => void; // Called while dragging
  onSeek: (percentage: number) => void; // Called on release
  isActive: boolean;
  downloadProgress?: number; // 0-100%
}

const InteractiveProgressBar: React.FC<InteractiveProgressBarProps> = ({
  progress,
  onPreview,
  onSeek,
  isActive = true,
  downloadProgress = 0
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPulseHint, setShowPulseHint] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Throttle preview updates to prevent excessive scrolling (50ms throttle)
  const throttledPreview = useThrottle((percentage: number) => {
    onPreview(percentage);
  }, 50);

  // Smooth progress animation (disabled during drag for immediate feedback)
  const smoothProgress = useSmoothProgress({
    currentValue: progress,
    targetValue: progress,
    duration: 200,
    enabled: isActive && !isDragging, // No animation while dragging
  });

  // Calculate percentage from mouse/touch position
  const calculatePercentage = useCallback((clientX: number) => {
    if (!progressBarRef.current) return 0;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    return Math.max(0, Math.min(100, percentage));
  }, []);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();

    setShowPulseHint(false); // Hide pulse on interaction
    setIsDragging(true);
    const percentage = calculatePercentage(e.clientX);
    setPreviewPosition(percentage);
    throttledPreview(percentage); // Use throttled preview
  };

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const percentage = calculatePercentage(e.clientX);
      setPreviewPosition(percentage);
      throttledPreview(percentage); // Use throttled preview
    }
  }, [isDragging, calculatePercentage, throttledPreview]);

  // Handle drag end (commit)
  const handleMouseUp = useCallback(() => {
    if (isDragging && previewPosition !== null) {
      setIsLoading(true);
      onSeek(previewPosition); // Start TTS from this position

      // Reset after short delay
      setTimeout(() => {
        setIsLoading(false);
        setIsDragging(false);
        setPreviewPosition(null);
      }, 500);
    }
  }, [isDragging, previewPosition, onSeek]);

  // Handle hover (show preview without dragging)
  const handleMouseHover = (e: React.MouseEvent) => {
    if (!isDragging && isActive) {
      const percentage = calculatePercentage(e.clientX);
      setPreviewPosition(percentage);
    }
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    e.preventDefault();

    setShowPulseHint(false); // Hide pulse on interaction
    const touch = e.touches[0];
    setIsDragging(true);
    const percentage = calculatePercentage(touch.clientX);
    setPreviewPosition(percentage);
    throttledPreview(percentage); // Use throttled preview
  };

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      e.preventDefault();
      const percentage = calculatePercentage(e.touches[0].clientX);
      setPreviewPosition(percentage);
      throttledPreview(percentage); // Use throttled preview
    }
  }, [isDragging, calculatePercentage, throttledPreview]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (isDragging && previewPosition !== null) {
      setIsLoading(true);
      onSeek(previewPosition);

      setTimeout(() => {
        setIsLoading(false);
        setIsDragging(false);
        setPreviewPosition(null);
      }, 500);
    }
  }, [isDragging, previewPosition, onSeek]);

  // Add/remove event listeners
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Show pulse hint when TTS becomes active
  React.useEffect(() => {
    if (isActive) {
      setShowPulseHint(true);
      const timer = setTimeout(() => {
        setShowPulseHint(false);
      }, 4000); // Hide after 4 seconds

      return () => {
        clearTimeout(timer);
      };
    } else {
      setShowPulseHint(false);
    }
  }, [isActive]);

  // Display position: preview while dragging, smooth progress otherwise
  const displayPosition = isDragging && previewPosition !== null ? previewPosition : smoothProgress;

  return (
    <div className="relative mb-1">
      <div
        ref={progressBarRef}
        className={`w-full bg-gray-200 rounded-full h-2 relative ${isActive ? 'cursor-pointer' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseHover}
        onMouseLeave={() => !isDragging && setPreviewPosition(null)}
        onTouchStart={handleTouchStart}
      >
        {/* Progress Track Background */}
        <div className="h-full w-full bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden relative">

          {/* Download Progress Indicator (Secondary Fill) - Gray/Buffed Color */}
          {downloadProgress !== undefined && downloadProgress > 0 && downloadProgress < 100 && (
            <div
              className="absolute top-0 left-0 h-full bg-blue-500/40 dark:bg-blue-400/30 transition-all duration-300 ease-linear"
              style={{ width: `${downloadProgress}%` }}
            />
          )}

          {/* Playback Progress (Primary Fill) - Accent Color */}
          <div
            className={`h-full rounded-full transition-all ${isDragging ? 'bg-amber-400' : 'bg-gradient-to-r from-amber-600 to-amber-800'
              }`}
            style={{
              width: `${displayPosition}%`,
              transitionDuration: isDragging ? '0ms' : '300ms'
            }}
          />
        </div>

        {/* Draggable handle */}
        {isActive && (
          <>
            {/* Pulsing ring effect */}
            {showPulseHint && !isDragging && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400 opacity-75 animate-ping"
                style={{ left: `calc(${displayPosition}% - 8px)` }}
              />
            )}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 rounded-full shadow-lg transition-all z-10 ${isDragging ? 'scale-125 border-amber-400' : 'border-amber-600 hover:scale-110'
                } ${showPulseHint && !isDragging ? 'animate-pulse' : ''}`}
              style={{ left: `calc(${displayPosition}% - 8px)` }}
            />
          </>
        )}
      </div>

      {/* Progress info */}
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>
          {isDragging ? 'Release to start from...' : (
            <>
              Chapter Progress (<span className="text-[10px]">Drag to listen ahead</span>)
            </>
          )}
        </span>
        <span className={`font-medium flex items-center gap-1 ${isDragging ? 'text-amber-500' : 'text-amber-700'
          }`}>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          {Math.round(displayPosition)}%
        </span>
      </div>
    </div>
  );
};

export default InteractiveProgressBar;
