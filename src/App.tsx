// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BookProvider, useBook } from './context/BookContext';
import { useAuth } from './context/AuthContext';
import Library from './components/Library';
import Header from "./components/Library/header";
import SuspenseLoader from './components/Common/SuspenseLoader';
import BlogListPage from './pages/blog/BlogListPage';
import BlogPostPage from './pages/blog/BlogPostPage';
import './App.css';

// Lazy load the Reader component since it's heavy and not needed initially
const Reader = React.lazy(() => import('./components/Reader'));

const MainApp: React.FC = () => {
  const { isReading } = useBook();
  return (
    <div className="app">
      {!isReading && <Header />}
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

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  React.useEffect(() => {
    if (loading) {
      console.log('[Perf] UI gated by auth session fetch...');
      const timerName = `[Perf] auth-loading-gate-${Date.now()}`;
      console.time(timerName);
      const timerRef = { current: timerName };
      return () => {
        if (timerRef.current) {
          console.timeEnd(timerRef.current);
        }
      };
    } else {
      console.log('[Perf] Auth resolved. Rendering app.');
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <BookProvider>
        <AppContent />
      </BookProvider>
    </Router>
  );
};

export default App;