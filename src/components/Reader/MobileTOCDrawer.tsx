import React, { useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import TableOfContents from '../Library/TableOfContents';
import { TOCItem } from '../../types/books';

interface MobileTOCDrawerProps {
  toc: TOCItem[];
  onItemClick: (item: TOCItem) => void;
  theme: 'light' | 'dark' | 'sepia';
}

/**
 * Mobile Table of Contents Drawer Component
 * Handles the sliding drawer for TOC navigation on mobile devices
 */
export const MobileTOCDrawer: React.FC<MobileTOCDrawerProps> = ({
  toc,
  onItemClick,
  theme
}) => {
  const [isTocDrawerOpen, setIsTocDrawerOpen] = useState<boolean>(false);

  const toggleTocDrawer = useCallback(() => {
    setIsTocDrawerOpen(prev => !prev);
  }, []);

  const closeTocDrawer = useCallback(() => {
    setIsTocDrawerOpen(false);
  }, []);

  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
    onItemClick(item);
    closeTocDrawer(); // Close mobile drawer after navigation
  }, [onItemClick, closeTocDrawer]);

  return (
    <>
      {/* Mobile TOC Button */}
      <button 
        onClick={toggleTocDrawer}
        className="mobile-toc-button md:hidden p-2 text-gray-600 hover:text-amber-800 transition-colors mr-2"
        aria-label="Toggle Table of Contents"
      >
        <Menu className="w-5 h-5" />
      </button>
      
      {/* Mobile TOC Drawer */}
      {isTocDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="toc-drawer-backdrop md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeTocDrawer}
          />
          
          {/* Drawer */}
          <div className={`toc-drawer md:hidden fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl flex flex-col theme-${theme}`}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">Table of Contents</h3>
              <button 
                onClick={closeTocDrawer}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close Table of Contents"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MobileTOCDrawer; 