// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { BookProvider, useBook } from './context/BookContext';
import { useAuth } from './context/AuthContext';
import Library from './components/Library';
import Header from "./components/Library/header";
import Footer from "./components/Common/Footer";
import SuspenseLoader from './components/Common/SuspenseLoader';
import { ToastContainer } from './components/Common/Toast';
import { ToastProvider, useToast } from './context/ToastContext';
import BlogListPage from './pages/blog/BlogListPage';
import BlogPostPage from './pages/blog/BlogPostPage';
import TopicListPage from './pages/blog/TopicListPage';
import TopicPage from './pages/blog/TopicPage';
import TopicArticlePage from './pages/blog/TopicArticlePage';
import BlogExample from './components/Blog/BlogExample';
import AuthCallback from './pages/auth/callback';
// import ScannerPage from './pages/ScannerPage'; // Temporarily disabled
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
        <>
          <Library />
          <Footer />
        </>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  // *** NEW: Don't gate everything behind auth loading ***
  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/blog-test" element={<BlogExample />} />
      
      {/* New topic-based blog routes */}
      <Route path="/topics" element={<TopicListPage />} />
      <Route path="/topics/:topicSlug" element={<TopicPage />} />
      <Route path="/topics/:topicSlug/:articleSlug" element={<TopicArticlePage />} />
      
      {/* Scanner - Temporarily disabled */}
      {/* <Route path="/scanner" element={<ScannerPage />} /> */}
      
      {/* Auth callback route for OAuth providers */}
      <Route path="/auth/callback" element={
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>}>
          <AuthCallback />
        </React.Suspense>
      } />
      
      {/* Protected routes - auth required */}
      <Route path="/" element={
        loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        ) : (
          <MainApp />
        )
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router>
        <ToastProvider>
          <BookProvider>
            <AppContent />
            <ToastWrapper />
          </BookProvider>
        </ToastProvider>
      </Router>
    </HelmetProvider>
  );
};

const ToastWrapper: React.FC = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
};

export default App;