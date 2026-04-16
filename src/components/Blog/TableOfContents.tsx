import React, { useEffect, useState } from 'react';
import './TableOfContents.css';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  content: string;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    console.log('TableOfContents received content:', content);
    if (content) {
      extractHeadings();
    }
  }, [content]);

  useEffect(() => {
    const handleScroll = () => {
      highlightCurrentSection();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const extractHeadings = () => {
    if (!content) return;
    
    // Create a temporary div to parse HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const headingElements = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const extractedHeadings: Heading[] = [];
    
    headingElements.forEach((element) => {
      const level = parseInt(element.tagName.charAt(1));
      const text = element.textContent || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      extractedHeadings.push({ level, text, id });
    });
    
    console.log('Extracted headings:', extractedHeadings);
    setHeadings(extractedHeadings);
  };

  const highlightCurrentSection = () => {
    if (headings.length === 0) return;
    
    let currentSection = '';
    
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 100) {
          currentSection = heading.id;
        }
      }
    });
    
    setActiveSection(currentSection);
  };

  const scrollToSection = (id: string) => {
    // First try to find by ID
    let element = document.getElementById(id);
    
    // If not found, try to find by text content
    if (!element) {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headingElements.forEach((heading) => {
        if (heading.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === id) {
          element = heading;
          // Add the ID for future reference
          element.id = id;
        }
      });
    }
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Debug: Show content and headings for development
  console.log('TOC Debug - Content:', content);
  console.log('TOC Debug - Headings:', headings);
  
  if (headings.length === 0) {
    return (
      <div className="toc-container">
        <div className="toc-header">
          <h3 className="toc-title">📚 Table of Contents</h3>
        </div>
        <div className="p-4 text-sm text-gray-500">
          No headings found. Content: {content ? content.substring(0, 100) + '...' : 'No content'}
        </div>
      </div>
    );
  }

  return (
    <div className="toc-container">
      <div className="toc-header">
        <h3 className="toc-title">📚 Table of Contents</h3>
        <button className="toc-toggle" onClick={toggleVisibility}>
          {isVisible ? '☰' : '☰'}
        </button>
      </div>
      
      {isVisible && (
        <nav className="toc-nav">
          <ul className="toc-list">
            {headings.map((heading, index) => (
              <li 
                key={index} 
                className={`toc-item toc-level-${heading.level} ${
                  activeSection === heading.id ? 'toc-active' : ''
                }`}
                style={{ marginLeft: `${(heading.level - 1) * 20}px` }}
              >
                <a 
                  href={`#${heading.id}`}
                  className="toc-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(heading.id);
                  }}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default TableOfContents;
