// src/components/Reader/index.tsx
import React from 'react';
import { useBook } from '../../context/BookContext';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import SimplePlayMode from './SimplePlayMode';
// import TableOfContents from './';
// import SearchBar from './SearchBar';
import Controls from './Controls';
import './Reader.css';
import TableOfContents from '../Library/TableOfContents';
import SearchBar from '../Library/SearchBar';

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

  const { speak, stop, isSpeaking } = useTextToSpeech();

  const handleTTS = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(currentPageText);
    }
  };

  return (
    <div className="reader">
      <header className="reader-header">
        <div className="reader-nav">
          <button onClick={closeBook} className="back-button">
            ← Back to Library
          </button>
          <h2>{bookTitle}</h2>
          <p className="author">{bookAuthor}</p>
        </div>
        
        <Controls 
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={prevPage}
          onNext={nextPage}
          onReadAloud={handleTTS}
          isReading={isSpeaking}
          onAudiobook={togglePlayMode}
          isPlayModeActive={isPlayModeVisible}
        />
      </header>
      
      <div className="reader-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading book...</p>
          </div>
        )}
        
        <div className="reader-sidebar">
          <TableOfContents items={toc} onItemClick={navigateToTocItem} />
        </div>
        
        <div className="reader-main">
          <SearchBar />
          
          <div 
            className="epub-content" 
            dangerouslySetInnerHTML={{ __html: currentContent }}
          ></div>
        </div>

        {isPlayModeVisible && (
          <SimplePlayMode
            currentPageContent={currentPageText}
            onClose={() => togglePlayMode()}
          />
        )}
      </div>
    </div>
  );
};

export default Reader;