import React, { useState, useEffect } from 'react';
import './SuspenseLoader.css';

const quotes = [
  "A reader lives a thousand lives before he dies . . . The man who never reads lives only one.",
  "Until I feared I would lose it, I never loved to read. One does not love breathing.",
  "That's the thing about books. They let you travel without moving your feet.",
  "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
  "A book is a dream that you hold in your hand.",
  "Reading is a conversation. All books talk. But a good book listens as well.",
  "Books are a uniquely portable magic."
];

const SuspenseLoader: React.FC = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex(prevIndex => (prevIndex + 1) % quotes.length);
    }, 2000);

    return () => clearInterval(quoteInterval);
  }, []);

  return (
    <div className="simple-suspense-container">
      <div className="simple-suspense-content">
        {/* Simple Spinner */}
        <div className="simple-suspense-spinner"></div>

        {/* Loading Text */}
        <div className="simple-suspense-text">
          <h3 className="simple-suspense-title">Loading Reader</h3>
          <p className="simple-suspense-subtitle">{quotes[quoteIndex]}</p>
        </div>
      </div>
    </div>
  );
};

export default SuspenseLoader;