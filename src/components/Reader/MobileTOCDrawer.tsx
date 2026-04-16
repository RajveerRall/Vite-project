import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import TableOfContents from '../Library/TableOfContents';
import { TOCItem } from '../../types/books';

interface MobileTOCDrawerProps {
  toc: TOCItem[];
  onItemClick: (item: TOCItem) => void;
  theme: 'light' | 'dark' | 'sepia';
  openByDefault?: boolean; // New prop to control initial state
  isOpen?: boolean; // Controlled state - if provided, component is controlled
  onClose?: () => void; // Callback when drawer should close
}

/**
 * Mobile Table of Contents Drawer Component
 * Handles the sliding drawer for TOC navigation on mobile devices
 * Now positioned next to the settings icon in the action buttons row
 */
export const MobileTOCDrawer: React.FC<MobileTOCDrawerProps> = ({
  toc,
  onItemClick,
  theme,
  openByDefault = false, // Default to closed, but can be overridden
  isOpen,
  onClose
}) => {
  // Internal state for when component is uncontrolled
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(openByDefault);
  
  // Use controlled state if provided, otherwise use internal state
  const isTocDrawerOpen = isOpen !== undefined ? isOpen : internalIsOpen;

  // Open the drawer by default when the component mounts (when a book is opened)
  // This provides a better UX by showing chapters immediately when a book opens
  // Only applies when component is uncontrolled (no isOpen prop)
  useEffect(() => {
    if (isOpen !== undefined) return; // Skip if controlled
    
    console.log('[MobileTOCDrawer] useEffect triggered:', { openByDefault, tocLength: toc.length, isTocDrawerOpen });
    if (openByDefault && toc.length > 0) {
      console.log('[MobileTOCDrawer] Opening drawer by default');
      // Add a small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        console.log('[MobileTOCDrawer] Setting drawer to open');
        setInternalIsOpen(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [openByDefault, toc.length, isOpen]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  }, [onClose]);

  const toggleTocDrawer = useCallback(() => {
    if (isOpen !== undefined && onClose) {
      // If controlled, toggle via callback
      if (isOpen) {
        onClose();
      }
      // Note: We can't "open" via this internal button if strictly controlled without an onOpen callback
      // but if isOpen is passed, usually the parent controls the button too
    } else {
      setInternalIsOpen(prev => !prev);
    }
  }, [isOpen, onClose]);

  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
    onItemClick(item);
    handleClose(); // Close mobile drawer after navigation
  }, [onItemClick, handleClose]);

  return (
    <>
      {/* Mobile TOC Button - Only show if uncontrolled (no isOpen prop) */}
      {isOpen === undefined && (
        <button 
          onClick={toggleTocDrawer}
          className="mobile-toc-button md:hidden flex items-center gap-2 px-3 py-2 transition-colors rounded-lg bg-amber-50 hover:bg-amber-100 mobile-toc-btn border border-amber-300 text-amber-800"
          aria-label="Toggle Table of Contents"
          title="Table of Contents"
        >
          <Menu className="w-5 h-5" />
          <span className="text-sm font-medium">Chapters</span>
        </button>
      )}
      
      {/* Mobile TOC Drawer - Rendered via Portal to avoid clipping */}
      {isTocDrawerOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="toc-drawer-backdrop md:hidden fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={handleClose}
          />
          
          {/* Drawer */}
          <div className={`toc-drawer md:hidden fixed left-0 top-0 h-full w-80 max-w-[85vw] z-[70] transform transition-transform duration-300 ease-in-out shadow-xl flex flex-col theme-${theme}`}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0 toc-drawer-header">
              <h3 className="text-lg font-semibold toc-drawer-title">Table of Contents</h3>
              <button 
                onClick={handleClose}
                className="p-1 transition-colors toc-drawer-close-btn"
                aria-label="Close Table of Contents"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 toc-drawer-content">
              <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default MobileTOCDrawer; 