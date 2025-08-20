// src/App.tsx
import React from 'react';
import { BookProvider, useBook } from './context/BookContext';
import { useAuth } from './context/AuthContext';
import Library from './components/Library';
import Header from "./components/Library/header";
import { AuthForm } from './components/Auth/AuthForm';
import SuspenseLoader from './components/Common/SuspenseLoader';
import './App.css';

// Lazy load the Reader component since it's heavy and not needed initially
const Reader = React.lazy(() => import('./components/Reader'));

const AppContent: React.FC = () => {
  const { isReading } = useBook();
  const { loading } = useAuth();

  React.useEffect(() => {
    if (loading) {
      console.log('[Perf] UI gated by auth session fetch...');
      // Use a unique timer name to avoid conflicts in development
      const timerName = `[Perf] auth-loading-gate-${Date.now()}`;
      console.time(timerName);
      
      // Store timer name in ref to avoid closure issues
      const timerRef = { current: timerName };
      
      return () => {
        // Cleanup: end timer if component unmounts while loading
        if (timerRef.current) {
          console.timeEnd(timerRef.current);
        }
      };
    } else {
      console.log('[Perf] Auth resolved. Rendering app.');
    }
  }, [loading]);
  
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
      {isReading ? (
        <React.Suspense fallback={<SuspenseLoader />}>
          <Reader />
        </React.Suspense>
      ) : (
        <Library />
      )}
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