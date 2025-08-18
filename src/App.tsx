// src/App.tsx
import React from 'react';
import { BookProvider, useBook } from './context/BookContext';
import { useAuth } from './context/AuthContext';
import Library from './components/Library';
import Reader from './components/Reader';
import Header from "./components/Library/header";
import { AuthForm } from './components/Auth/AuthForm';
import './App.css';

const AppContent: React.FC = () => {
  const { isReading } = useBook();
  const { loading } = useAuth();
  
  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="app">
      {/* Only show Header when NOT reading a book */}
      {!isReading && <Header />}
      {/* Render the Library or Reader component based on the context */}
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