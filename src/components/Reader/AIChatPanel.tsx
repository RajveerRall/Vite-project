import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, Headphones } from 'lucide-react';
import { loadChapterSummary, saveChapterSummary } from '../../utils/chapterSummaryStorage';

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
            {onReadAloud && summary && summary.trim().length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReadAloud(summary);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                aria-label="Read summary aloud"
                title="Read summary aloud"
              >
                <Headphones className="w-4 h-4" />
                <span>Read Aloud</span>
              </button>
            )}
          </div>
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
          <button
            onClick={handleRequestSummarize}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Summarize Chapter</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AIChatPanel;
