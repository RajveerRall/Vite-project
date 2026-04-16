// src/components/Reader/PageNavigationIndicator.tsx
// Visual indicator showing when user can scroll to next/previous page

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './PageNavigationIndicator.css';

interface PageNavigationIndicatorProps {
  showTop: boolean;
  showBottom: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export const PageNavigationIndicator: React.FC<PageNavigationIndicatorProps> = ({
  showTop,
  showBottom,
  canGoPrev,
  canGoNext,
}) => {
  return (
    <>
      {/* Top indicator - shows when near top and can go to previous page */}
      {showTop && canGoPrev && (
        <div className="page-nav-indicator page-nav-indicator-top">
          <ChevronUp className="page-nav-icon" />
          <span className="page-nav-text">Scroll up for previous page</span>
        </div>
      )}

      {/* Bottom indicator - shows when near bottom and can go to next page */}
      {showBottom && canGoNext && (
        <div className="page-nav-indicator page-nav-indicator-bottom">
          <ChevronDown className="page-nav-icon" />
          <span className="page-nav-text">Scroll down for next page</span>
        </div>
      )}
    </>
  );
};

