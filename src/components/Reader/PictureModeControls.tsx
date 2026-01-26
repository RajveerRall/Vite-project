
import React from 'react';
import { PlayCircle, PauseCircle, Square, Image as ImageIcon } from 'lucide-react';
import InteractiveProgressBar from './InteractiveProgressBar';
import './Controls.css';

interface PictureModeControlsProps {
    theme?: 'light' | 'dark' | 'sepia';
    active: boolean;
    status: string;
    buffered: number;
    needsTap: boolean;
    paused?: boolean;
    onPause?: () => void;
    onResume?: () => void;
    onStop: () => void;
    // Progress
    currentChunkIndex?: number | null;
    totalChunks?: number;
    onSeek?: (percentage: number) => void;
    onPreview?: (percentage: number) => void;
}

const PictureModeControls: React.FC<PictureModeControlsProps> = ({
    theme,
    status,
    buffered,
    needsTap,
    paused,
    onPause,
    onResume,
    onStop,
    currentChunkIndex,
    totalChunks = 0,
    onSeek,
    onPreview
}) => {
    // Calculate Full Cast Progress
    const progress = (totalChunks > 0 && typeof currentChunkIndex === 'number')
        ? Math.round(((currentChunkIndex + 1) / totalChunks) * 100)
        : 0;

    return (
        <div className={`music-player-controls theme-${theme} bg-white rounded-xl border border-gray-200 shadow-lg p-3 transition-all duration-300`}>
            {/* 
         DESIGN CHOICE:
         We keep the layout similar to the main reader controls for consistency,
         but this component is exclusively for Picture Mode state.
      */}

            {/* Progress Bar Row */}
            <div className="mb-3 px-1">
                <InteractiveProgressBar
                    progress={progress}
                    onPreview={onPreview || (() => { })}
                    onSeek={onSeek || (() => { })}
                    isActive={!!onSeek}
                />
            </div>

            {/* Control Buttons Row */}
            <div className="flex items-center justify-between px-1">

                {/* Left: Status Indicator */}
                <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0 flex-1">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full flex-shrink-0 ${needsTap ? 'bg-amber-500 animate-pulse' : 'bg-blue-600 animate-pulse'
                        }`} />
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-gray-800 truncate">
                            {needsTap ? "Tap to Play" : status}
                        </span>
                        {buffered > 0 && !needsTap && (
                            <span className="text-[10px] text-gray-500 font-medium">
                                Buffered: {buffered} segments
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Playback Controls */}
                <div className="flex items-center gap-3">
                    {!paused ? (
                        <button
                            onClick={onPause}
                            className="p-2.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            aria-label="Pause"
                            title="Pause"
                        >
                            <PauseCircle size={28} />
                        </button>
                    ) : (
                        <button
                            onClick={onResume}
                            className="p-2.5 rounded-full hover:bg-amber-50 text-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            aria-label="Resume"
                            title="Resume"
                        >
                            <PlayCircle size={28} />
                        </button>
                    )}

                    <div className="h-6 w-px bg-gray-200 mx-1"></div>

                    <button
                        onClick={onStop}
                        className="p-2.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        aria-label="Stop"
                        title="Stop Picture Mode"
                    >
                        <Square size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PictureModeControls;
