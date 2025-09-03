import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import './FloatingReadButton.css';

interface FloatingReadButtonProps {
  onRead: () => void;
  isVisible: boolean;
}

const FloatingReadButton: React.FC<FloatingReadButtonProps> = ({ onRead, isVisible }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isNativeMenuVisible, setIsNativeMenuVisible] = useState(false);
  // Persist last valid selection range to restore it on mobile before calling TTS
  const lastSelectionRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Save range to restore later on mobile
        lastSelectionRangeRef.current = range.cloneRange();
        
        // Position the button above the selected text
        // On mobile, position it much higher to avoid Chrome's native selection menu
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let topOffset, leftPosition;
        
        if (isMobile) {
          // On mobile, position much higher to avoid Chrome's selection menu (which appears ~40-60px above selection)
          topOffset = 120; // Much higher to clear the native menu
          
          // Also check if button would go off-screen and adjust
          const buttonWidth = 80;
          const screenWidth = window.innerWidth;
          const centerX = rect.left + (rect.width / 2);
          
          // Ensure button stays within screen bounds
          if (centerX - (buttonWidth / 2) < 10) {
            leftPosition = 10; // Too far left, align to left edge
          } else if (centerX + (buttonWidth / 2) > screenWidth - 10) {
            leftPosition = screenWidth - buttonWidth - 10; // Too far right, align to right edge
          } else {
            leftPosition = centerX - (buttonWidth / 2); // Center normally
          }
        } else {
          // Desktop positioning (unchanged)
          topOffset = 60;
          leftPosition = rect.left + (rect.width / 2) - 40;
        }
        
        setPosition({
          top: rect.top - topOffset,
          left: leftPosition
        });
        
        setSelectedText(selection.toString().trim());
        
        // Clear any existing hide timeout
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          setHideTimeout(null);
        }
      } else {
        // On mobile, add a delay before hiding to allow user to tap the button
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          // Clear any existing timeout
          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }
          
          // Set a delay before hiding on mobile
          const timeout = setTimeout(() => {
            setSelectedText('');
            setHideTimeout(null);
          }, 2000); // 2 second delay on mobile
          
          setHideTimeout(timeout);
        } else {
          // On desktop, hide immediately
          setSelectedText('');
        }
      }
    };

    // Handle native selection menu visibility on mobile
    const handleNativeMenuToggle = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, temporarily note the native menu; do NOT hide the button anymore
        setIsNativeMenuVisible(true);
        
        // Show our button again after a short delay (native menu usually disappears quickly)
        setTimeout(() => {
          setIsNativeMenuVisible(false);
        }, 700);
      }
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Also listen for mouse up to catch selections
    document.addEventListener('mouseup', handleSelectionChange);
    
    // Listen for touch end for mobile
    document.addEventListener('touchend', handleSelectionChange);
    
    // Listen for context menu events (when native menu appears)
    document.addEventListener('contextmenu', handleNativeMenuToggle);
    
    // Listen for touch events that might trigger native menu
    document.addEventListener('touchstart', handleNativeMenuToggle);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
      document.removeEventListener('contextmenu', handleNativeMenuToggle);
      document.removeEventListener('touchstart', handleNativeMenuToggle);
      
      // Clean up timeout on unmount
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  const restoreSelectionIfNeeded = () => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) return;
      
      const selection = window.getSelection();
      const hasActive = selection && selection.rangeCount > 0 && selection.toString().trim().length > 0;
      if (!hasActive && lastSelectionRangeRef.current) {
        selection?.removeAllRanges();
        selection?.addRange(lastSelectionRangeRef.current);
        // Update selectedText from restored selection
        const restored = selection?.toString().trim() || '';
        if (restored) setSelectedText(restored);
        console.log('[FloatingReadButton] Restored selection before invoking TTS:', restored.substring(0, 50));
      }
    } catch (e) {
      // Ignore selection restoration failures
    }
  };

  const handleReadClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[FloatingReadButton] Button clicked:', {
      selectedText: selectedText.substring(0, 50),
      isVisible,
      isNativeMenuVisible
    });
    
    // Clear any hide timeout when button is clicked
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }

    // On mobile, Chrome may clear selection when tapping the overlay button.
    // Restore the selection range right before calling onRead so the TTS logic can detect it.
    restoreSelectionIfNeeded();
    
    // Call the original onRead function
    console.log('[FloatingReadButton] Calling onRead function...');
    onRead();
  };

  // Always render when visible and there is selected text. Do not hide purely due to native menu visibility.
  if (!isVisible || !selectedText) {
    console.log('[FloatingReadButton] Button not rendered:', {
      isVisible,
      hasSelectedText: !!selectedText,
      isNativeMenuVisible,
      selectedTextPreview: selectedText?.substring(0, 30)
    });
    return null;
  }

  console.log('[FloatingReadButton] Button rendered:', {
    position,
    selectedTextPreview: selectedText.substring(0, 30),
    isVisible,
    isNativeMenuVisible
  });

  return (
    <div 
      className="floating-read-button"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <button
        onClick={handleReadClick}
        onTouchEnd={handleReadClick}
        className="read-button"
        aria-label={`Read selected text: ${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}`}
        title="Read selected text"
      >
        <Play className="w-4 h-4" />
        <span>Read</span>
      </button>
    </div>
  );
};

export default FloatingReadButton;
