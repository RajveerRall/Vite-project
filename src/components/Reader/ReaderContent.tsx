// src/components/Reader/ReaderContent.tsx
// Main reading content area component

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ReaderContentProps {
  // Content
  content: string;
  highlightedContent?: string;
  
  // Navigation
  onPageClick: () => void;
  onChapterNavigation: (direction: 'prev' | 'next') => void;
  
  // UI state
  showNavigationArrows: boolean;
  
  // Refs
  contentRef: React.RefObject<HTMLDivElement>;
}

/**
 * Reader content component for displaying book content
 * Extracted from Reader component for better separation of concerns
 */
export const ReaderContent: React.FC<ReaderContentProps> = ({
  content,
  highlightedContent,
  onPageClick,
  onChapterNavigation,
  showNavigationArrows,
  contentRef,
}) => {
  return (
    <div className="reader-main" ref={contentRef}>
      <div
        className="epub-content"
        onClick={onPageClick}
        onContextMenu={(e) => {
          // Prevent native context menu on text selection to avoid obstruction
          e.preventDefault();
        }}
        style={{ whiteSpace: 'pre-wrap' }}
        dangerouslySetInnerHTML={{ __html: highlightedContent || content }}
      />

      {showNavigationArrows && (
        <>
          <button
            onClick={() => onChapterNavigation('prev')}
            className="chapter-nav-arrow chapter-nav-arrow-left"
            aria-label="Previous chapter"
            title="Previous chapter"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={() => onChapterNavigation('next')}
            className="chapter-nav-arrow chapter-nav-arrow-right"
            aria-label="Next chapter"
            title="Next chapter"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}
    </div>
  );
};

