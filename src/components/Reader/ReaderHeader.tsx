// src/components/Reader/ReaderHeader.tsx
// Header component for Reader (mobile + desktop variants)

import React from 'react';
import { ChevronLeft, Headphones } from 'lucide-react';
import { TOCItem } from '../../types/books';
import MobileTOCDrawer from './MobileTOCDrawer';

export interface ReaderHeaderProps {
  // Book info
  bookTitle: string;
  currentChapterTitle?: string;
  
  // Actions
  onClose: () => void;
  onNavigateToTocItem: (item: TOCItem) => void;
  onScrollToHighlight: () => void;
  
  // UI state
  isMobile: boolean;
  isEnhanced: boolean;
  isFirstOpen: boolean;
  theme: string;
  showTTSHighlight: boolean; // Whether to show scroll-to-highlight button
  
  // Data
  toc: TOCItem[];
}

/**
 * Reader header component with mobile and desktop variants
 * Extracted from Reader component to improve maintainability
 */
export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  bookTitle,
  currentChapterTitle,
  onClose,
  onNavigateToTocItem,
  onScrollToHighlight,
  isMobile,
  isEnhanced,
  isFirstOpen,
  theme,
  showTTSHighlight,
  toc,
}) => {
  return (
    <header className="reader-header">
      {/* Mobile: Stacked layout */}
      <div className="reader-header-mobile md:hidden">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="back-button text-sm font-medium text-gray-600 hover:text-amber-800 flex items-center gap-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Library</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>

        <div className="text-center">
          <h2 className="book-title text-lg sm:text-xl">{bookTitle}</h2>
          {currentChapterTitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{currentChapterTitle}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mt-2">
          {isEnhanced && (
            <MobileTOCDrawer
              toc={toc}
              onItemClick={onNavigateToTocItem}
              theme={theme}
              openByDefault={isMobile && isFirstOpen}
            />
          )}

          {showTTSHighlight && (
            <button
              onClick={onScrollToHighlight}
              className="scroll-highlight-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Scroll to current highlight"
              title="Scroll to current highlight"
            >
              <Headphones className="w-5 h-5" />
              <span className="text-sm font-medium">Highlight</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="reader-header-desktop hidden md:flex items-center justify-between w-full">
        <div className="reader-left">
          <button
            onClick={onClose}
            className="back-button text-sm font-medium text-gray-600 hover:text-amber-800 flex items-center gap-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Library
          </button>
        </div>

        <div className="reader-center text-center">
          <h2 className="book-title">{bookTitle}</h2>
          {currentChapterTitle && (
            <p className="text-sm text-gray-500 mt-0.5">{currentChapterTitle}</p>
          )}
        </div>

        <div className="reader-right flex items-center gap-3">
          {showTTSHighlight && (
            <button
              onClick={onScrollToHighlight}
              className="scroll-highlight-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Scroll to current highlight"
              title="Scroll to current highlight"
            >
              <Headphones className="w-5 h-5" />
              <span className="text-sm font-medium">Highlight</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

