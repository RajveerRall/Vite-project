// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { BookProvider } from './context/BookContext';
import { useAuth } from './context/AuthContext';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import Library from './components/Library';
import Header from "./components/Library/header";
import Footer from "./components/Common/Footer";
import SuspenseLoader from './components/Common/SuspenseLoader';
import { ToastContainer } from './components/Common/Toast';
import { ToastProvider, useToast } from './context/ToastContext';
import GoogleOneTap from './components/Auth/GoogleOneTap';
// import ScannerPage from './pages/ScannerPage'; // Temporarily disabled
import './App.css';
import { useTTSUsageRecorder } from './hooks/useTTSUsageRecorder';
import { Capacitor } from '@capacitor/core';
import { initializeUsageTracking, updateUsageTrackerUserId } from './services/tts/index';
import { isTrackingEnabled } from './utils/trackingConfig';
import { SubscriptionProvider } from './context/SubscriptionContext';

// Lazy load the ReaderWrapper component since it's heavy and not needed initially
const ReaderWrapper = React.lazy(() => import('./components/Reader/ReaderWrapper'));

// Lazy load all non-critical routes - they won't be bundled in initial load
const BlogListPage = React.lazy(() => import('./pages/blog/BlogListPage'));
const BlogPostPage = React.lazy(() => import('./pages/blog/BlogPostPage'));
const TopicListPage = React.lazy(() => import('./pages/blog/TopicListPage'));
const TopicPage = React.lazy(() => import('./pages/blog/TopicPage'));
const TopicArticlePage = React.lazy(() => import('./pages/blog/TopicArticlePage'));
const BlogExample = React.lazy(() => import('./components/Blog/BlogExample'));
const AuthCallback = React.lazy(() => import('./pages/auth/callback'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const EpubToAudiobook = React.lazy(() => import('./pages/EpubToAudiobook'));
const AccountPage = React.lazy(() => import('./pages/account/AccountPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Simple loading fallback for lazy routes
const LazyRouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg text-gray-600">Loading...</div>
  </div>
);

const MainApp: React.FC = () => {
  const { isAuthenticated, hasExplicitlySignedOut } = useAuth();
  const location = useLocation();
  const isReaderRoute = location.pathname.startsWith('/reader');

  // Stabilize callbacks with useCallback to prevent re-creating on each render
  const handleGoogleSuccess = React.useCallback(() => {
    console.log('[App] Google One Tap login successful!');
    // The auth state will be updated automatically via Supabase auth state change
  }, []);

  const handleGoogleError = React.useCallback((error: Error) => {
    console.error('[App] Google One Tap login failed:', error);
  }, []);

  // Memoize GoogleOneTap to prevent re-mounts
  // Only mount if user is not authenticated AND has not explicitly signed out
  // This prevents GoogleOneTap from auto-triggering after explicit sign-out
  // DISABLED: Google One Tap sign-in
  const googleOneTapComponent = React.useMemo(() => {
    // Disabled Google One Tap
    return null;
    // if (!isAuthenticated && !hasExplicitlySignedOut && !Capacitor.isNativePlatform()) {
    //   return <GoogleOneTap 
    //     onSuccess={handleGoogleSuccess} 
    //     onError={handleGoogleError} 
    //   />;
    // }
    // return null;
  }, [isAuthenticated, hasExplicitlySignedOut, handleGoogleSuccess, handleGoogleError]);

  return (
    <div className="app">
      {/* Google One Tap disabled */}
      {/* {googleOneTapComponent} */}
      {!isReaderRoute && <Header />}
      <Routes>
        {/* Main app routes */}
        <Route path="/" element={<Library />} />
        <Route path="/account" element={
          <React.Suspense fallback={<LazyRouteFallback />}>
            <AccountPage />
          </React.Suspense>
        } />
        <Route path="/dashboard" element={
          <React.Suspense fallback={<LazyRouteFallback />}>
            <Dashboard />
          </React.Suspense>
        } />
        <Route path="/reader/:bookId" element={
          <React.Suspense fallback={<SuspenseLoader />}>
            <ReaderWrapper />
          </React.Suspense>
        } />
      </Routes>
      {!isReaderRoute && <Footer />}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  // Globally listen for TTS usage events and persist to Supabase when needed
  useTTSUsageRecorder();
  
  // Initialize usage tracking on app start and when user changes (only if tracking enabled)
  React.useEffect(() => {
    if (isTrackingEnabled()) {
      initializeUsageTracking(user?.id).catch(console.error);
    } else {
      console.log('[App] Usage tracking disabled in development');
    }
  }, []);
  
  React.useEffect(() => {
    // Update tracker when user logs in/out (only if tracking enabled)
    if (isTrackingEnabled()) {
      updateUsageTrackerUserId(user?.id);
    }
  }, [user?.id]);
  
  React.useEffect(() => {
    // Handle warm link
    const sub = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      console.log('[Auth Deep Link] appUrlOpen url =', url);
      if (url?.startsWith('yoread://auth/callback')) {
        try {
          const { supabase } = await import('./lib/supabase');
          console.log('[Auth Deep Link] Exchanging code for session (warm)...');
          
          // Add timeout protection
          const exchangePromise = supabase.auth.exchangeCodeForSession(url);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Session exchange timeout after 10 seconds')), 10000);
          });
          
          await Promise.race([exchangePromise, timeoutPromise]);
          console.log('[Auth Deep Link] Session exchange complete (warm).');
        } catch (error) {
          console.error('[Auth Deep Link] Session exchange failed (warm):', error);
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
          
          // Add timeout protection
          const exchangePromise = supabase.auth.exchangeCodeForSession(url);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Session exchange timeout after 10 seconds')), 10000);
          });
          
          await Promise.race([exchangePromise, timeoutPromise]);
          console.log('[Auth Deep Link] Session exchange complete (cold).');
        }
      } catch (error) {
        console.error('[Auth Deep Link] Session exchange failed (cold):', error);
      }
    })();
    return () => { 
      // CapacitorApp.addListener returns a Promise that resolves to a PluginListenerHandle
      // Handle both Promise and direct handle cases
      if (sub && typeof sub === 'object' && 'then' in sub) {
        // It's a Promise
        (sub as Promise<any>).then(handle => handle?.remove?.()).catch(() => {});
      } else if (sub && typeof (sub as any).remove === 'function') {
        // It's a direct handle
        (sub as any).remove();
      }
    };
  }, []);

  // *** NEW: Don't gate everything behind auth loading ***
  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/blog" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <BlogListPage />
        </React.Suspense>
      } />
      <Route path="/blog/:slug" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <BlogPostPage />
        </React.Suspense>
      } />
      <Route path="/blog-test" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <BlogExample />
        </React.Suspense>
      } />
      <Route path="/terms" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <TermsOfService />
        </React.Suspense>
      } />
      <Route path="/epub-to-audiobook" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <EpubToAudiobook />
        </React.Suspense>
      } />
      
      {/* New topic-based blog routes */}
      <Route path="/topics" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <TopicListPage />
        </React.Suspense>
      } />
      <Route path="/topics/:topicSlug" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <TopicPage />
        </React.Suspense>
      } />
      <Route path="/topics/:topicSlug/:articleSlug" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <TopicArticlePage />
        </React.Suspense>
      } />
      
      {/* Scanner - Temporarily disabled */}
      {/* <Route path="/scanner" element={<ScannerPage />} /> */}
      
      {/* Auth callback route for OAuth providers */}
      <Route path="/auth/callback" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <AuthCallback />
        </React.Suspense>
      } />
      
      {/* Main app routes - auth required - use wildcard to allow nested routes */}
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router>
        <ToastProvider>
          <BookProvider>
            <SubscriptionProvider>
              <AppContent />
              <ToastWrapper />
            </SubscriptionProvider>
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