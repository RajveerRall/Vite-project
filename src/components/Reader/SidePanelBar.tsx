import React from 'react';
import { List, MessageSquare } from 'lucide-react';

interface SidePanelBarProps {
  activePanel: 'toc' | 'ai-chat' | null;
  onPanelChange: (panel: 'toc' | 'ai-chat' | null) => void;
  theme: 'light' | 'dark' | 'sepia';
}

const SidePanelBar: React.FC<SidePanelBarProps> = ({ activePanel, onPanelChange, theme }) => {
  const handleTocClick = () => {
    if (activePanel === 'toc') {
      onPanelChange(null);
    } else {
      onPanelChange('toc');
    }
  };

  const handleAIChatClick = () => {
    if (activePanel === 'ai-chat') {
      onPanelChange(null);
    } else {
      onPanelChange('ai-chat');
    }
  };

  return (
    <div className="side-panel-bar hidden md:flex">
      <button
        className={`side-panel-icon ${activePanel === 'toc' ? 'active' : ''}`}
        onClick={handleTocClick}
        aria-label={activePanel === 'toc' ? 'Close Table of Contents' : 'Open Table of Contents'}
        title={activePanel === 'toc' ? 'Close Table of Contents' : 'Open Table of Contents'}
      >
        <List className="w-5 h-5" />
      </button>
      <button
        className={`side-panel-icon ${activePanel === 'ai-chat' ? 'active' : ''}`}
        onClick={handleAIChatClick}
        aria-label={activePanel === 'ai-chat' ? 'Close AI Summary' : 'Open AI Summary'}
        title={activePanel === 'ai-chat' ? 'Close AI Summary' : 'Open AI Summary'}
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    </div>
  );
};

export default SidePanelBar;



