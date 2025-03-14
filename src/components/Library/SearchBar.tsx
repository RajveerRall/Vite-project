// src/components/Reader/SearchBar.tsx
import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch = () => {}, 
  onClear = () => {} 
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Function to handle search submission
  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  // Function to handle clearing the search
  const handleClear = () => {
    setSearchQuery('');
    onClear();
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Default implementation if no custom handlers provided
  // This will highlight text in the epub-content element
  useEffect(() => {
    if (!onSearch || onSearch.toString().includes('() => {}')) {
      const defaultSearch = () => {
        if (!searchQuery) return;
        
        const content = document.querySelector('.epub-content');
        if (content) {
          // Remove any previous highlights
          const highlights = content.querySelectorAll('.search-highlight');
          highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            if (parent) {
              parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
            }
          });
          
          // If the query is empty after clearing, we're done
          if (!searchQuery.trim()) return;
          
          // Create a walker to traverse all text nodes
          const walker = document.createTreeWalker(
            content,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                // Skip script and style tags
                const parent = node.parentNode as HTMLElement;
                if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
                  return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );
          
          // Search all text nodes
          let node;
          while (node = walker.nextNode()) {
            const text = node.textContent || '';
            const lowerText = text.toLowerCase();
            const lowerQuery = searchQuery.toLowerCase();
            
            let index = lowerText.indexOf(lowerQuery);
            if (index !== -1) {
              // We found the text, now we need to replace it with a highlighted version
              const parent = node.parentNode;
              if (parent) {
                let currentIndex = 0;
                const fragments = [];
                
                // Add all instances of the search query in this text node
                while (index !== -1) {
                  // Add the text before the match
                  if (index > currentIndex) {
                    fragments.push(document.createTextNode(text.substring(currentIndex, index)));
                  }
                  
                  // Add the highlighted match
                  const highlight = document.createElement('span');
                  highlight.className = 'search-highlight';
                  highlight.textContent = text.substring(index, index + searchQuery.length);
                  fragments.push(highlight);
                  
                  // Update indices
                  currentIndex = index + searchQuery.length;
                  index = lowerText.indexOf(lowerQuery, currentIndex);
                }
                
                // Add any remaining text
                if (currentIndex < text.length) {
                  fragments.push(document.createTextNode(text.substring(currentIndex)));
                }
                
                // Replace the original text node with our fragments
                parent.replaceChild(fragments[0], node);
                for (let i = 1; i < fragments.length; i++) {
                  parent.insertBefore(fragments[i], fragments[i-1].nextSibling);
                }
              }
            }
          }
          
          // Scroll to the first highlight
          const firstHighlight = content.querySelector('.search-highlight');
          if (firstHighlight) {
            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      };
      
      const defaultClear = () => {
        const content = document.querySelector('.epub-content');
        if (content) {
          const highlights = content.querySelectorAll('.search-highlight');
          highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            if (parent) {
              parent.replaceChild(document.createTextNode((highlight as HTMLElement).innerText), highlight);
            }
          });
        }
      };
      
      if (searchQuery) {
        defaultSearch();
      } else {
        defaultClear();
      }
    }
  }, [searchQuery, onSearch]);

  return (
    <div className="search-container">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search in current page..."
        onKeyPress={handleKeyPress}
        className="search-input"
      />
      <button 
        onClick={handleSearch}
        className="search-button"
      >
        Search
      </button>
      <button 
        onClick={handleClear}
        className="clear-button"
      >
        Clear
      </button>
    </div>
  );
};

export default SearchBar;