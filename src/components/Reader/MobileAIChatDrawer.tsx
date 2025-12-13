import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import AIChatPanel from './AIChatPanel';

interface MobileAIChatDrawerProps {
  theme: 'light' | 'dark' | 'sepia';
  currentPageText?: string;
  currentChapterTitle?: string;
  bookId?: string;
  onReadAloud?: (text?: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Mobile AI Chat Drawer Component
 * Handles the sliding drawer for AI Chat on mobile devices
 * Positioned next to the Chapters button in the action buttons row
 */
export const MobileAIChatDrawer: React.FC<MobileAIChatDrawerProps> = ({
  theme,
  currentPageText,
  currentChapterTitle,
  bookId,
  onReadAloud,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);

  // Use controlled state if provided, otherwise use internal state
  const isAIChatDrawerOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const toggleAIChatDrawer = useCallback(() => {
    const newState = !isAIChatDrawerOpen;
    if (onOpenChange) {
      onOpenChange(newState);
    } else {
      setInternalIsOpen(newState);
    }
  }, [isAIChatDrawerOpen, onOpenChange]);

  const closeAIChatDrawer = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setInternalIsOpen(false);
    }
  }, [onOpenChange]);

  return (
    <>
      {/* Mobile AI Summary Button */}
      <button 
        onClick={toggleAIChatDrawer}
        className="control-button md:hidden flex items-center gap-2 px-3 py-2"
        aria-label="Toggle AI Summary"
        title="AI Summary"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="button-text text-sm font-medium">AI Summary</span>
      </button>
      
      {/* Mobile AI Chat Drawer - Rendered via Portal to avoid clipping */}
      {isAIChatDrawerOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="ai-chat-drawer-backdrop md:hidden fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={closeAIChatDrawer}
          />
          
          {/* Drawer */}
          <div className={`ai-chat-drawer toc-drawer md:hidden fixed left-0 top-0 h-full w-80 max-w-[85vw] z-[70] transform transition-transform duration-300 ease-in-out shadow-xl flex flex-col theme-${theme}`}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0 toc-drawer-header">
              <h3 className="text-lg font-semibold toc-drawer-title">AI Summary</h3>
              <button 
                onClick={closeAIChatDrawer}
                className="p-1 transition-colors toc-drawer-close-btn"
                aria-label="Close AI Summary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 toc-drawer-content">
              <AIChatPanel 
                chapterText={currentPageText}
                chapterTitle={currentChapterTitle}
                bookId={bookId}
                onReadAloud={onReadAloud}
                autoSummarize={false}
              />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default MobileAIChatDrawer;
