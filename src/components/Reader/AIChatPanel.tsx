import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, Volume2, Pause, Play } from 'lucide-react';
import { loadChapterSummary, saveChapterSummary } from '../../utils/chapterSummaryStorage';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAnonymousUsageLimit } from '../../hooks/useAnonymousUsageLimit';
import { trackEvent } from '../../lib/analytics';
import { playStandaloneTTS, StandaloneTTSController } from '../../utils/standaloneTTS';
import { useAuth } from '../../context/AuthContext';
import { getAnonymousSessionId } from '../../utils/anonymousSession';
import './Controls.css';

interface AIChatPanelProps {
  chapterText?: string;
  chapterTitle?: string;
  bookId?: string;
  onSummarizeRequested?: () => void;
  onReadAloud?: (text?: string) => void;
  autoSummarize?: boolean;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({ 
  chapterText, 
  chapterTitle,
  bookId,
  onSummarizeRequested,
  onReadAloud,
  autoSummarize = false
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldSummarize, setShouldSummarize] = useState(false);
  const [lastChapterText, setLastChapterText] = useState<string | undefined>(undefined);
  const hasAutoSummarizedRef = useRef(false);
  const isRequestInProgressRef = useRef(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const ttsControllerRef = useRef<StandaloneTTSController | null>(null);
  
  // Subscription and usage limit hooks
  const { usageLimit, isLimitExceeded, minutesRemaining } = useSubscription();
  const anonymousLimit = useAnonymousUsageLimit();
  const { user } = useAuth();
  
  // Calculate display minutes
  const displayMinutes = minutesRemaining !== null && minutesRemaining > 0
    ? `${(minutesRemaining / 60).toFixed(1)}h`
    : '0h';
  
  // Check if Read Aloud button should be disabled
  const isReadAloudDisabled = isLimitExceeded || 
    (minutesRemaining !== null && minutesRemaining < 1) || 
    anonymousLimit?.isLimitReached || 
    false;

  const handleSummarize = useCallback(async () => {
    if (!chapterText || !bookId) {
      console.log('[AIChatPanel] No chapter text or bookId available, skipping summarization');
      return;
    }

    // Prevent duplicate requests
    if (isRequestInProgressRef.current || isLoading) {
      console.log('[AIChatPanel] Request already in progress, skipping');
      return;
    }

    // Check if summary already exists in localStorage
    const stored = loadChapterSummary(bookId, chapterTitle, chapterText);
    if (stored?.summary) {
      console.log('[AIChatPanel] Summary already exists in localStorage, using cached version');
      setSummary(stored.summary);
      hasAutoSummarizedRef.current = true;
      return;
    }
    
    console.log('[AIChatPanel] Starting summarization...', { 
      chapterTextLength: chapterText.length,
      chapterTitle 
    });
    
    isRequestInProgressRef.current = true;
    setIsLoading(true);
    setError(null);
    setSummary(null);
    
    if (onSummarizeRequested) {
      onSummarizeRequested();
    }
    
    try {
      console.log('[AIChatPanel] Calling summarizeChapter API...');
      const { summarizeChapter } = await import('../../services/fullCastTTS');
      const result = await summarizeChapter(chapterText, chapterTitle);
      console.log('[AIChatPanel] Summary received:', { 
        summaryLength: result.summary?.length,
        preview: result.summary?.substring(0, 100) 
      });
      
      // Save to localStorage
      if (result.summary && bookId) {
        saveChapterSummary(bookId, result.summary, chapterTitle, chapterText);
      }
      
      setSummary(result.summary);
      hasAutoSummarizedRef.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to summarize chapter';
      console.error('[AIChatPanel] Summarization error:', err);
      console.error('[AIChatPanel] Error details:', {
        errorMessage,
        chapterTextLength: chapterText.length,
        chapterTitle
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setShouldSummarize(false);
      isRequestInProgressRef.current = false;
    }
  }, [chapterText, chapterTitle, bookId, onSummarizeRequested, isLoading]);

  // Load summary from localStorage when component mounts or chapter changes
  useEffect(() => {
    if (bookId && chapterText && chapterText !== lastChapterText) {
      // Try to load from localStorage
      const stored = loadChapterSummary(bookId, chapterTitle, chapterText);
      if (stored?.summary) {
        console.log('[AIChatPanel] Loaded summary from localStorage');
        setSummary(stored.summary);
        hasAutoSummarizedRef.current = true;
      } else {
        setSummary(null);
        hasAutoSummarizedRef.current = false;
      }
      setError(null);
      setShouldSummarize(false);
      setLastChapterText(chapterText);
    }
  }, [bookId, chapterText, chapterTitle, lastChapterText]);

  // Auto-trigger summarization when autoSummarize is true and chapterText is available
  useEffect(() => {
    if (autoSummarize && chapterText && chapterText === lastChapterText && !isLoading && !summary && !hasAutoSummarizedRef.current) {
      handleSummarize();
    }
  }, [autoSummarize, chapterText, lastChapterText, isLoading, summary, handleSummarize]);

  // Auto-trigger summarization when chapterText changes and shouldSummarize is true
  useEffect(() => {
    if (chapterText && shouldSummarize && !isLoading && !summary) {
      handleSummarize();
    }
  }, [chapterText, shouldSummarize, isLoading, summary, handleSummarize]);

  const handleRetry = useCallback(() => {
    setError(null);
    setShouldSummarize(true);
  }, []);

  const handleRequestSummarize = useCallback(() => {
    // Prevent multiple simultaneous requests
    if (isLoading) {
      return;
    }
    // Call handleSummarize directly to show loading state immediately
    handleSummarize();
  }, [isLoading, handleSummarize]);

  const handleReadAloudClick = useCallback(async () => {
    console.log('[AIChatPanel] Read Aloud button clicked', {
      hasSummary: !!summary,
      summaryLength: summary?.length,
      isReadAloudDisabled,
      isTTSLoading,
      isTTSPlaying,
      isTTSPaused,
      userId: user?.id,
      chapterTitle,
      bookId,
    });

    // If paused, resume
    if (isTTSPaused && ttsControllerRef.current) {
      try {
        await ttsControllerRef.current.resume();
        setIsTTSPaused(false);
        setIsTTSPlaying(true);
      } catch (error) {
        console.error('[AIChatPanel] Failed to resume:', error);
        setTtsError(error instanceof Error ? error.message : 'Failed to resume playback');
      }
      return;
    }

    // If playing, pause
    if (isTTSPlaying && ttsControllerRef.current) {
      ttsControllerRef.current.pause();
      setIsTTSPaused(true);
      setIsTTSPlaying(false);
      return;
    }

    // Start new playback
    if (!summary) {
      console.warn('[AIChatPanel] No summary available, cannot play');
      return;
    }

    if (isReadAloudDisabled) {
      console.warn('[AIChatPanel] Read Aloud is disabled due to limits');
      return;
    }

    console.log('[AIChatPanel] Starting TTS playback for summary');
    setIsTTSLoading(true);
    setTtsError(null);
    setIsTTSPlaying(false);
    setIsTTSPaused(false);

    // Track the event
    trackEvent('ai_summary_read_aloud', {
      summary_length: summary.length,
      chapter_title: chapterTitle || 'Unknown',
      book_id: bookId || 'Unknown',
    });

    try {
      const sessionId = user?.id ? undefined : getAnonymousSessionId();
      
      const controller = await playStandaloneTTS(summary, {
        userId: user?.id,
        sessionId,
        onError: (error) => {
          console.error('[AIChatPanel] Standalone TTS error:', error);
          setTtsError(error.message);
          setIsTTSLoading(false);
          setIsTTSPlaying(false);
          setIsTTSPaused(false);
          ttsControllerRef.current = null;
        },
        onPlaybackStart: () => {
          console.log('[AIChatPanel] Summary playback started');
          setIsTTSLoading(false);
          setIsTTSPlaying(true);
          setIsTTSPaused(false);
        },
        onPlaybackEnd: () => {
          console.log('[AIChatPanel] Summary playback ended');
          setIsTTSPlaying(false);
          setIsTTSPaused(false);
          ttsControllerRef.current = null;
        },
        onPlaybackPause: () => {
          setIsTTSPaused(true);
          setIsTTSPlaying(false);
        },
        onPlaybackResume: () => {
          setIsTTSPaused(false);
          setIsTTSPlaying(true);
        },
      });

      ttsControllerRef.current = controller;
    } catch (error) {
      console.error('[AIChatPanel] Failed to play summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to play summary';
      setTtsError(errorMessage);
      setIsTTSLoading(false);
      setIsTTSPlaying(false);
      setIsTTSPaused(false);
      ttsControllerRef.current = null;
    }
  }, [
    summary, 
    chapterTitle, 
    bookId, 
    isReadAloudDisabled, 
    user?.id, 
    isTTSLoading, 
    isTTSPlaying, 
    isTTSPaused,
    isLimitExceeded,
    minutesRemaining,
    anonymousLimit
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ttsControllerRef.current) {
        ttsControllerRef.current.stop();
        ttsControllerRef.current = null;
      }
    };
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div className="ai-chat-panel">
        <div className="ai-chat-placeholder ai-chat-loading">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-4" />
          <h3 className="ai-chat-title">Summarizing Chapter...</h3>
          <p className="ai-chat-message">Please wait while we analyze the chapter content.</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="ai-chat-panel">
        <div className="ai-chat-placeholder ai-chat-error">
          <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
          <h3 className="ai-chat-title">Error</h3>
          <p className="ai-chat-message" style={{ color: '#ef4444', marginBottom: '1rem' }}>
            {error}
          </p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Summary State
  if (summary) {
    return (
      <div className="ai-chat-panel">
        <div className="ai-chat-content">
          {/* Header with title and Read Aloud button */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            {chapterTitle && (
              <h3 className="ai-chat-title" style={{ marginBottom: 0, flex: 1 }}>
                {chapterTitle}
              </h3>
            )}
            {summary && summary.trim().length > 0 && (
              <button
                onClick={handleReadAloudClick}
                disabled={isReadAloudDisabled || isTTSLoading}
                className={`control-button flex items-center gap-2 ${
                  isTTSPlaying ? 'active' : ''
                }`}
                aria-label={
                  isTTSPaused 
                    ? 'Resume playback' 
                    : isTTSPlaying 
                    ? 'Pause playback' 
                    : 'Listen to summary'
                }
                title={
                  isTTSLoading
                    ? 'Loading audio...'
                    : isTTSPaused
                    ? 'Resume playback'
                    : isTTSPlaying
                    ? 'Pause playback'
                    : isReadAloudDisabled
                    ? (anonymousLimit?.isLimitReached
                        ? 'Free limit reached. Please sign up to continue.'
                        : 'TTS usage limit reached. Please upgrade your subscription to continue.')
                    : `Listen to summary (${displayMinutes} remaining)`
                }
              >
                {isTTSLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="button-text text-sm font-medium">Loading...</span>
                  </>
                ) : isTTSPaused ? (
                  <>
                    <Play className="w-5 h-5" />
                    <span className="button-text text-sm font-medium">Resume</span>
                  </>
                ) : isTTSPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span className="button-text text-sm font-medium">Pause</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    <span className="button-text text-sm font-medium">Listen</span>
                    <span className="button-text text-xs opacity-90">({displayMinutes})</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* Error message if TTS failed */}
          {ttsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {ttsError}
              </p>
            </div>
          )}
          
          <div className="ai-chat-summary">
            {summary.split('\n\n').map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              return (
                <p key={idx} className="ai-chat-paragraph">
                  {trimmed}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Empty State - Show prompt to summarize
  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-placeholder">
        <h3 className="ai-chat-title">AI Summary</h3>
        <p className="ai-chat-message">
          {chapterText 
            ? 'Click "Summarize Chapter" to get a summary of the current chapter.'
            : 'No chapter content available. Open a book to get started.'}
        </p>
        {chapterText && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleRequestSummarize}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Summarize Chapter</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatPanel;
