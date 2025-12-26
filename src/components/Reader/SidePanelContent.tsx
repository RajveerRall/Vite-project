import React, { useRef, useEffect, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import TableOfContents from '../Library/TableOfContents';
import AIChatPanel from './AIChatPanel';
import { TOCItem } from '../../types/books';

interface SidePanelContentProps {
  activePanel: 'toc' | 'ai-chat' | null;
  onClose: () => void;
  toc?: TOCItem[];
  onNavigateToTocItem?: (item: TOCItem) => void;
  theme: 'light' | 'dark' | 'sepia';
  contentPanelRef: React.RefObject<HTMLDivElement>;
  isDraggingHandle: boolean;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  currentPageText?: string;
  currentChapterTitle?: string;
  bookId?: string;
  onReadAloud?: (text?: string) => void;
  autoSummarize?: boolean;
}

const SidePanelContent: React.FC<SidePanelContentProps> = ({
  activePanel,
  onClose,
  toc = [],
  onNavigateToTocItem,
  theme,
  contentPanelRef,
  isDraggingHandle,
  onDragStart,
  currentPageText,
  currentChapterTitle,
  bookId,
  onReadAloud,
  autoSummarize,
}) => {
  const isOpen = activePanel !== null;

  // Sync content panel state with styles (when not dragging)
  useEffect(() => {
    if (contentPanelRef.current && !isDraggingHandle) {
      if (isOpen) {
        // Opening - clear inline styles to let CSS handle it
        contentPanelRef.current.style.width = '';
        contentPanelRef.current.style.padding = '';
        contentPanelRef.current.style.overflow = '';
        contentPanelRef.current.classList.remove('collapsed');
      } else {
        // Closing - set inline styles for immediate collapse
        contentPanelRef.current.style.width = '0px';
        contentPanelRef.current.style.padding = '0';
        contentPanelRef.current.style.overflow = 'hidden';
        contentPanelRef.current.classList.add('collapsed');
      }
      // Clean up visual feedback classes
      contentPanelRef.current.classList.remove('will-collapse', 'will-expand');
    }
  }, [isOpen, isDraggingHandle, contentPanelRef]);

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'toc':
        return 'Table of Contents';
      case 'ai-chat':
        return 'AI Summary';
      default:
        return '';
    }
  };

  return (
    <div
      ref={contentPanelRef}
      className={`side-panel-content md:block ${!isOpen ? 'collapsed' : ''} ${isDraggingHandle ? 'dragging' : ''}`}
    >
      {/* The main content (header and body) is now conditionally rendered */}
      {isOpen && (
        <>
          <div className="side-panel-content-header">
            <h3 className="side-panel-content-title">{getPanelTitle()}</h3>
            <button
              className="side-panel-close-btn"
              onClick={onClose}
              aria-label="Close panel"
              title="Close panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="side-panel-content-body">
            {activePanel === 'toc' && (
              <TableOfContents items={toc} onItemClick={onNavigateToTocItem || (() => {})} />
            )}
            {activePanel === 'ai-chat' && (
              <AIChatPanel 
                chapterText={currentPageText}
                chapterTitle={currentChapterTitle}
                bookId={bookId}
                onReadAloud={onReadAloud}
                autoSummarize={autoSummarize}
              />
            )}
          </div>
        </>
      )}

      {/* The draggable handle is now always rendered, outside the isOpen condition */}
      <div
        className="side-panel-drag-handle"
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        role="button"
        aria-label="Drag to resize panel"
        title="Drag to resize panel"
      >
        <div className="drag-handle-indicator"></div>
      </div>
    </div>
  );
};

export default SidePanelContent;



