// src/App.tsx
import React from 'react';
import { BookProvider, useBook } from './context/BookContext';
import Library from './components/Library';
import Reader from './components/Reader';
import './App.css';

const AppContent: React.FC = () => {
  const { isReading } = useBook();
  
  return (
    <div className="app">
      {isReading ? <Reader /> : <Library />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BookProvider>
      <AppContent />
    </BookProvider>
  );
};

export default App;