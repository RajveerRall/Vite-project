import React, { useState, useEffect, useCallback } from 'react';
import { useBook } from '../../context/BookContext';
import { TTSService } from '../../services/msedge';
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import { TOCItem } from '../../types/books';
import './Reader.css';
import FeatureHighlight from './FeatureHighlight';

const ttsService = TTSService.getInstance();
const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_';

const Reader: React.FC = () => {
  const {
    bookTitle,
    bookAuthor,
    currentPage,
    totalPages,
    currentContent,
    toc,
    closeBook,
    nextPage,
    prevPage,
    navigateToTocItem,
    isPlayModeVisible,
    togglePlayMode,
    currentPageText,
    isLoading
  } = useBook();

  const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false);
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(true);

  const getStorageKey = useCallback((): string | null => {
    if (!bookTitle) return null;
    const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${LOCAL_STORAGE_PREFIX}${safeTitle}`;
  }, [bookTitle]);

  const saveResumeIndex = useCallback((index: number) => {
    const key = getStorageKey();
    if (key && index >= 0) {
      try {
        const data = { page: currentPage, index: index };
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Saved progress: Page ${currentPage}, Index ${index} for key ${key}`);
      } catch (error) {
        console.error("Error saving progress to localStorage:", error);
      }
    }
  }, [currentPage, getStorageKey]);

  const loadResumeIndex = useCallback((): number | null => {
    const key = getStorageKey();
    if (key) {
      try {
        const savedData = localStorage.getItem(key);
        if (savedData) {
          const data = JSON.parse(savedData);
          if (data && typeof data.page === 'number' && data.page === currentPage && typeof data.index === 'number') {
            if (currentPageText && data.index >= currentPageText.length) {
                 console.warn(`Loaded index ${data.index} is out of bounds for page ${currentPage}. Clearing.`);
                 localStorage.removeItem(key);
                 return null;
            }
            console.log(`Loaded progress: Page ${data.page}, Index ${data.index} for key ${key}`);
            return data.index;
          } else if (data && data.page !== currentPage) {
             console.log(`Saved progress page ${data.page} doesn't match current page ${currentPage}. Clearing.`);
             localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error("Error loading progress from localStorage:", error);
        localStorage.removeItem(key);
      }
    }
    return null;
  }, [currentPage, getStorageKey, currentPageText]);

  const clearResumeIndex = useCallback(() => {
    const key = getStorageKey();
    if (key) {
      try {
        localStorage.removeItem(key);
        console.log(`Cleared progress for key ${key}`);
      } catch (error) {
        console.error("Error clearing progress from localStorage:", error);
      }
    }
    setResumeIndex(null);
  }, [getStorageKey]);

  useEffect(() => {
    if (bookTitle && currentPageText !== undefined) {
      const loadedIndex = loadResumeIndex();
      setResumeIndex(loadedIndex);
      setHasFinishedPlayback(false);
    } else if (!bookTitle) {
      setResumeIndex(null);
    }
  }, [currentPage, bookTitle, loadResumeIndex, currentPageText]);

  useEffect(() => {
    let wasActiveLastCheck = false;

    const checkStatus = () => {
      const currentlyPlaying = ttsService.isCurrentlyPlaying();
      const currentlyPaused = ttsService.isCurrentlyPaused();
      const currentlyProcessing = ttsService.isCurrentlyProcessing();
      const sessionActive = ttsService.isSessionActive();

      setIsSpeaking(currentlyPlaying);
      setIsPaused(currentlyPaused);
      setIsProcessing(currentlyProcessing && !sessionActive);

      if (wasActiveLastCheck && !sessionActive && !currentlyProcessing) {
        console.log("Playback session appears to have finished naturally.");
        setHasFinishedPlayback(true);
        clearResumeIndex();
      }
      wasActiveLastCheck = sessionActive;
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, 500);
    return () => clearInterval(intervalId);
  }, [clearResumeIndex]);

  const saveCurrentProgress = useCallback(() => {
    if (ttsService.isSessionActive()) {
      const currentIndex = ttsService.getCurrentPlaybackStartIndex();
      if (currentIndex >= 0) {
        saveResumeIndex(currentIndex);
        setHasFinishedPlayback(false);
      } else {
        console.warn("Tried to save progress, but got invalid index:", currentIndex);
      }
    } else {
    }
  }, [saveResumeIndex]);

  useEffect(() => {
    return () => {
      if (ttsService.isSessionActive()) {
        console.log("Reader cleanup: Saving progress before stopping TTS.");
        saveCurrentProgress();
        console.log("Reader cleanup: Stopping active TTS session.");
        ttsService.stopAudio();
      }
    };
  }, [currentPage, saveCurrentProgress]);

  const handleTTS = useCallback(async () => {
    if (isPaused) {
      console.log("Reader: Resuming audio from paused state.");
      ttsService.resumeAudio();
      return;
    }
    if (isSpeaking) {
      console.log("Reader: Pausing audio.");
      ttsService.pauseAudio();
      saveCurrentProgress();
      return;
    }

    if (!isProcessing && currentPageText) {
      let textToSpeak = currentPageText;

      if (resumeIndex !== null && resumeIndex >= 0 && !isSpeaking && !isPaused) {
          console.log(`Reader: Resuming from saved index: ${resumeIndex}`);
          textToSpeak = currentPageText.substring(resumeIndex);
          clearResumeIndex();
      }
      else {
          const selection = window.getSelection();
          const selectedText = selection?.toString().trim();
          if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
              console.log(`Reader: User selected text: "${selectedText.substring(0, 50)}..."`);
              const startIndex = currentPageText.indexOf(selectedText);
              if (startIndex !== -1) {
                  console.log(`Reader: Found selection at index ${startIndex}. Reading from selection.`);
                  textToSpeak = currentPageText.substring(startIndex);
                  clearResumeIndex();
              } else {
                  console.warn(`Reader: Could not match selection. Reading full page.`);
                  clearResumeIndex();
              }
          } else {
              if(resumeIndex !== null) {
                 console.log("Reader: No selection and not resuming. Clearing previously loaded resume index.");
                 clearResumeIndex();
              }
              console.log("Reader: Reading full page.");
          }
      }

      if (!textToSpeak) {
          console.warn("Reader: No text determined to speak (possibly empty selection/resume point).");
          setIsProcessing(false);
          return;
      }

      console.log(`Reader: Attempting to speak text (first 100 chars): "${textToSpeak.substring(0, 100)}..."`);
      setHasFinishedPlayback(false);
      try {
        setIsProcessing(true);
        setIsSpeaking(false);
        setIsPaused(false);

        await ttsService.speakTextInChunks(textToSpeak, {
          voice: 'en-US-BrianMultilingualNeural',
          format: 'audio-24khz-48kbitrate-mono-mp3',
          rate: 1.0,
          pitch: '+0Hz'
        });
      } catch (error) {
        console.error('TTS Error starting playback:', error);
        ttsService.stopAudio();
        setIsSpeaking(false);
        setIsPaused(false);
        setIsProcessing(false);
        clearResumeIndex();
      }
    } else if (!currentPageText) {
        console.warn("Reader: Cannot start TTS, currentPageText is empty.");
    } else {
        console.log("Reader: Already processing TTS, ignoring request.");
    }
  }, [ isPaused, isSpeaking, isProcessing, currentPageText, resumeIndex, saveCurrentProgress, clearResumeIndex ]);

  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
      if (ttsService.isSessionActive()) {
          saveCurrentProgress();
          ttsService.stopAudio();
      }
      navigateToTocItem(item);
  }, [navigateToTocItem, saveCurrentProgress]);

  const handlePrevPage = useCallback(() => {
      if (ttsService.isSessionActive()) {
        saveCurrentProgress();
        ttsService.stopAudio();
      }
      prevPage();
  }, [prevPage, saveCurrentProgress]);

  const handleNextPage = useCallback(() => {
      if (ttsService.isSessionActive()) {
          saveCurrentProgress();
          ttsService.stopAudio();
      }
      nextPage();
  }, [nextPage, saveCurrentProgress]);

  const handleCloseBook = useCallback(() => {
        if (ttsService.isSessionActive()) {
            saveCurrentProgress();
            ttsService.stopAudio();
        }
        closeBook();
  }, [closeBook, saveCurrentProgress]);

  return (
    <div className="reader">
      <header className="reader-header">
        <div className="reader-left">
          <button onClick={handleCloseBook} className="back-button">
            ← Back to Library
          </button>
        </div>
        <div className="reader-center">
          <h2 className="book-title">{bookTitle}</h2>
          <p className="book-author">{bookAuthor}</p>
        </div>
        <div className="reader-right">
          <div className="controls-container">
            <Controls
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={handlePrevPage}
              onNext={handleNextPage}
              onReadAloud={handleTTS}
              isReading={isSpeaking}
              isPaused={isPaused}
              isProcessing={isProcessing}
              canResume={resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback}
              onAudiobook={togglePlayMode}
              isPlayModeActive={isPlayModeVisible}
              isReadButtonActive={isSpeaking || isPaused || (resumeIndex !== null && !isProcessing && !hasFinishedPlayback)}
            />
          </div>
        </div>
      </header>

      <div className="reader-container">
        {(isLoading || isProcessing) && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>{isLoading ? 'Loading book...' : isProcessing ? 'Preparing audio...' : 'Loading...'}</p>
          </div>
        )}
        <div className="reader-sidebar">
          <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
        </div>
        <div className="reader-main">
          <SearchBar />
          <div
            className="epub-content"
            dangerouslySetInnerHTML={{ __html: currentContent }}
          ></div>
        </div>
        {isPlayModeVisible && (
          useKokoroTTS ? (
            <KokoroPlayMode
              currentPageContent={currentPageText}
              onClose={togglePlayMode}
            />
          ) : (
            <SimplePlayMode
              currentPageContent={currentPageText}
              onClose={togglePlayMode}
            />
          )
        )}
      </div>

      {showFeatureHighlight && (
        <FeatureHighlight onClose={() => setShowFeatureHighlight(false)} />
      )}
    </div>
  );
};

export default Reader;