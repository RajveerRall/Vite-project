// src/components/Reader/TableOfContents.tsx
import React from 'react';
import { TOCItem } from '../../types/book';

interface TableOfContentsProps {
  items: TOCItem[];
  onItemClick: (item: TOCItem) => void;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ items, onItemClick }) => {
  // Recursive function to render TOC items with their children
  const renderTocItems = (tocItems: TOCItem[]) => {
    return (
      <ul className="toc-list">
        {tocItems.map(item => (
          <li key={item.id} className="toc-item">
            <button 
              className="toc-button"
              onClick={() => onItemClick(item)}
            >
              {item.label}
            </button>
            {item.children.length > 0 && (
              <div className="toc-children">
                {renderTocItems(item.children)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="toc-container">
      <h3 className="toc-heading">Table of Contents</h3>
      {items.length > 0 ? (
        renderTocItems(items)
      ) : (
        <p className="no-toc">No table of contents available</p>
      )}
    </div>
  );
};

export default TableOfContents;