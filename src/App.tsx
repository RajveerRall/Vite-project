// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { BookProvider, useBook } from './context/BookContext';
import { useAuth } from './context/AuthContext';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
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
import TermsOfService from './pages/TermsOfService';
import FloatingGooglePrompt from './components/Auth/FloatingGooglePrompt';
import GoogleOneTap from './components/Auth/GoogleOneTap';
// import ScannerPage from './pages/ScannerPage'; // Temporarily disabled
import './App.css';

// Lazy load the Reader component since it's heavy and not needed initially
const Reader = React.lazy(() => import('./components/Reader'));

const MainApp: React.FC = () => {
  const { isReading } = useBook();
  const { isAuthenticated } = useAuth();
  return (
    <div className="app">
      {!isAuthenticated && <GoogleOneTap />}
      {!isReading && <Header />}
      {isReading ? (
        <React.Suspense fallback={<SuspenseLoader />}>
          <Reader />
        </React.Suspense>
      ) : (
        <>
          <Library />
          <Footer />
          {!isAuthenticated && <FloatingGooglePrompt />}
        </>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { loading } = useAuth();
  React.useEffect(() => {
    // Handle warm link
    const sub = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      console.log('[Auth Deep Link] appUrlOpen url =', url);
      if (url?.startsWith('yoread://auth/callback')) {
        try {
          const { supabase } = await import('./lib/supabase');
          console.log('[Auth Deep Link] Exchanging code for session (warm)...');
          await supabase.auth.exchangeCodeForSession(url);
          console.log('[Auth Deep Link] Session exchange complete (warm).');
        } finally {
          try { await Browser.close(); } catch {}
        }
      }
    });
    // Handle cold start
    (async () => {
      try {
        const anyApp: any = CapacitorApp as any;
        const info = await anyApp.getLaunchUrl?.();
        const url = info?.url as string | undefined;
        console.log('[Auth Deep Link] getLaunchUrl url =', url);
        if (url?.startsWith('yoread://auth/callback')) {
          const { supabase } = await import('./lib/supabase');
          console.log('[Auth Deep Link] Exchanging code for session (cold)...');
          await supabase.auth.exchangeCodeForSession(url);
          console.log('[Auth Deep Link] Session exchange complete (cold).');
        }
      } catch {}
    })();
    return () => { (sub as any)?.remove?.(); };
  }, []);

  // *** NEW: Don't gate everything behind auth loading ***
  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/blog-test" element={<BlogExample />} />
      <Route path="/terms" element={<TermsOfService />} />
      
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