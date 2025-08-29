import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import './FloatingReadButton.css';

interface FloatingReadButtonProps {
  onRead: () => void;
  isVisible: boolean;
}

const FloatingReadButton: React.FC<FloatingReadButtonProps> = ({ onRead, isVisible }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position the button above the selected text
        setPosition({
          top: rect.top - 60, // 60px above the selection
          left: rect.left + (rect.width / 2) - 40 // Center horizontally (button is 80px wide)
        });
        
        setSelectedText(selection.toString().trim());
      } else {
        setSelectedText('');
      }
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Also listen for mouse up to catch selections
    document.addEventListener('mouseup', handleSelectionChange);
    
    // Listen for touch end for mobile
    document.addEventListener('touchend', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
    };
  }, []);

  if (!isVisible || !selectedText) {
    return null;
  }

  return (
    <div 
      className="floating-read-button"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <button
        onClick={onRead}
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
