import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTTS } from '../../context/TTSContext';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import SettingsWidget from '../Settings/SettingsWidget';
import './MiniPlayer.css';

export const MiniPlayer: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        isPlaying,
        isPaused,
        currentBookId,
        currentBookTitle,
        currentBookAuthor,
        currentChapterId,
        currentChapterTitle,
        currentChunkIndex,
        play,
        pause,
        stop,
        seekToChunk,
        setPlaybackRate
    } = useTTS();
    const {
        fontSize,
        theme,
        handleFontSizeChange,
        handleThemeChange,
        handleVoiceChange,
        selectedVoice
    } = useReaderSettings();

    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    // Only show if there's active playback AND not on the Reader page
    const isOnReaderPage = location.pathname.startsWith('/reader');
    const isVisible = (isPlaying || isPaused) && currentBookId && !isOnReaderPage;

    if (!isVisible) return null;

    const handleOpenBook = () => {
        if (currentBookId) {
            const params = new URLSearchParams();
            if (currentChapterId) {
                params.set('chapter', currentChapterId);
            }
            navigate(`/reader/${currentBookId}?${params.toString()}`);
        }
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };

    const handlePrevious = () => {
        if (currentChunkIndex !== null && currentChunkIndex > 0) {
            seekToChunk(currentChunkIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentChunkIndex !== null) {
            seekToChunk(currentChunkIndex + 1);
        }
    };

    const handleStop = () => {
        stop();
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const speed = parseFloat(e.target.value);
        setPlaybackRate(speed);
    };

    // Display book title or fallback
    const displayTitle = currentBookTitle || 'Unknown Book';

    // Display chapter title or fallback
    const displayChapter = currentChapterTitle || (currentChapterId ? `Chapter ${currentChapterId.split('/').pop()?.replace('.xhtml', '').replace('.html', '').replace('_', ' ')}` : 'Reading...');

    return (
        <div className={`mini-player ${theme}`}>
            <div className="mini-player-content">
                {/* Book Info */}
                <div
                    className="mini-player-info"
                    onClick={handleOpenBook}
                    style={{ cursor: 'pointer' }}
                    title="Return to Reader"
                >
                    <div className="mini-player-title">
                        {displayTitle}
                    </div>
                    <div className="mini-player-chapter">
                        {displayChapter}
                    </div>
                </div>

                {/* Controls */}
                <div className="mini-player-controls">
                    <button
                        className="mini-player-btn mini-player-btn-prev"
                        onClick={handlePrevious}
                        title="Previous Sentence"
                        disabled={currentChunkIndex === null || currentChunkIndex === 0}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        className="mini-player-btn mini-player-btn-play"
                        onClick={handlePlayPause}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <button
                        className="mini-player-btn mini-player-btn-next"
                        onClick={handleNext}
                        title="Next Sentence"
                        disabled={currentChunkIndex === null}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>

                    <button
                        className="mini-player-btn mini-player-btn-stop"
                        onClick={handleStop}
                        title="Stop"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="1" />
                        </svg>
                    </button>
                </div>

                {/* Right Side Actions (Speed + Settings) */}
                <div className="mini-player-actions">
                    {/* Speed Control */}
                    <div className="mini-player-speed">
                        <select
                            className="mini-player-speed-select"
                            onChange={handleSpeedChange}
                            defaultValue="1"
                            title="Playback Speed"
                        >
                            <option value="0.5">0.5×</option>
                            <option value="0.75">0.75×</option>
                            <option value="1">1×</option>
                            <option value="1.25">1.25×</option>
                            <option value="1.5">1.5×</option>
                        </select>
                    </div>

                    {/* Settings Control */}
                    <div className="mini-player-settings">
                        <button
                            className="mini-player-btn mini-player-btn-settings"
                            onClick={() => setIsSettingsOpen(true)}
                            title="Reading Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Shared Settings Widget */}
            <SettingsWidget
                fontSize={fontSize}
                theme={theme}
                isSettingsOpen={isSettingsOpen}
                selectedVoice={selectedVoice}
                increaseFontSize={() => handleFontSizeChange(fontSize + 1)}
                decreaseFontSize={() => handleFontSizeChange(Math.max(12, fontSize - 1))}
                resetFontSize={() => handleFontSizeChange(18)}
                changeTheme={handleThemeChange}
                onVoiceChange={handleVoiceChange}
                closeSettings={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};
