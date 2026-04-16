import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import { TTSProvider } from './context/TTSContext'; // Phase 7
import { GlobalAudioPlayer } from './components/TTS/GlobalAudioPlayer'; // Phase 7
import { MiniPlayer } from './components/TTS/MiniPlayer'; // Phase 7.5
import GoogleOneTap from './components/Auth/GoogleOneTap';
// import ScannerPage from './pages/ScannerPage'; // Temporarily disabled
import './App.css';
import { useTTSUsageRecorder } from './hooks/useTTSUsageRecorder';
import { Capacitor } from '@capacitor/core';
import { initializeUsageTracking, updateUsageTrackerUserId } from './services/tts/index';
import { isTrackingEnabled } from './utils/trackingConfig';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { UsageTracker } from './services/retention/UsageTracker';
import { NotificationScheduler } from './services/retention/NotificationScheduler';
import { ReaderSettingsProvider } from './context/ReaderSettingsContext';

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
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy')); // Add this line
const EpubToAudiobook = React.lazy(() => import('./pages/EpubToAudiobook'));
const AIPDFReader = React.lazy(() => import('./pages/AIPDFReader'));
const SpeechifyAlternative = React.lazy(() => import('./pages/SpeechifyAlternative'));
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
  const googleOneTapComponent = React.useMemo(() => {
    if (!isAuthenticated && !hasExplicitlySignedOut && !Capacitor.isNativePlatform()) {
      return <GoogleOneTap
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
      />;
    }
    return null;
  }, [isAuthenticated, hasExplicitlySignedOut, handleGoogleSuccess, handleGoogleError]);

  return (
    <div className="app">
      {googleOneTapComponent}
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
  const { addBook, openBook, books } = useBook();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Ref to access books without causing dependency issues
  const booksRef = React.useRef(books);
  React.useEffect(() => {
    booksRef.current = books;
  }, [books]);

  // Helper to handle incoming file URLs (intents)
  const handleFileUrl = React.useCallback(async (url: string) => {
    console.log('[File Intent] Handling URL:', url);
    const isFileUri = url.startsWith('content://') || url.startsWith('file://');

    if (isFileUri) {
      try {
        addToast('Importing book...', 'info');

        // Fetch the file content
        const response = await fetch(Capacitor.convertFileSrc(url));
        const blob = await response.blob();

        // Get filename from URL or default
        let filename = 'imported_book';
        try {
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split('/');
          filename = decodeURIComponent(pathSegments[pathSegments.length - 1]) || filename;
        } catch (e) {
          // If URL parsing fails, try to infer from the string
          const pathParts = url.split('/');
          filename = decodeURIComponent(pathParts[pathParts.length - 1]) || filename;
        }

        // Ensure we have an extension if possible
        if (!filename.includes('.')) {
          if (blob.type === 'application/epub+zip') filename += '.epub';
        }

        const file = new File([blob], filename, { type: blob.type });

        console.log('[File Intent] Adding book to library:', filename);
        const newBook = await addBook(file);

        console.log('[File Intent] Auto-opening book:', newBook.title);
        await openBook(newBook);

        addToast(`Successfully imported: ${newBook.title}`, 'success');
        navigate(`/reader/${newBook.id}`);
      } catch (error) {
        console.error('[File Intent] Error importing file:', error);
        addToast(`Failed to import book: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    }
  }, [addBook, openBook, navigate, addToast]);

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

  // Retention System: Track app state changes for smart notifications
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return; // Only run on mobile
    }

    let debounceTimer: NodeJS.Timeout | null = null;

    const handleAppStateChange = async (state: { isActive: boolean }) => {
      // Debounce rapid app switching
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        if (state.isActive) {
          // User opened the app
          console.log('[Retention] App became active');
          await UsageTracker.logSession();
          await NotificationScheduler.cancelAll();
        } else {
          // User backgrounded the app
          console.log('[Retention] App went to background');
          const currentBooks = booksRef.current;
          await NotificationScheduler.scheduleReminders(currentBooks);
        }
      }, 500); // 500ms debounce
    };

    const listener = CapacitorApp.addListener('appStateChange', handleAppStateChange);

    // Also track on initial mount (app opened)
    UsageTracker.logSession().catch(console.error);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      // Handle both Promise and direct handle cases
      if (listener && typeof listener === 'object' && 'then' in listener) {
        (listener as Promise<any>).then(handle => handle?.remove?.()).catch(() => { });
      } else if (listener && typeof (listener as any).remove === 'function') {
        (listener as any).remove();
      }
    };
  }, []);

  React.useEffect(() => {
    // Handle warm link
    const sub = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      console.log('[Auth Deep Link] appUrlOpen url =', url);

      // Handle File Intents
      if (url?.startsWith('content://') || url?.startsWith('file://')) {
        handleFileUrl(url);
        return;
      }

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
          try { await Browser.close(); } catch { }
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

        // Handle File Intents (Cold Start)
        if (url?.startsWith('content://') || url?.startsWith('file://')) {
          handleFileUrl(url);
          return;
        }

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
        (sub as Promise<any>).then(handle => handle?.remove?.()).catch(() => { });
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
      <Route path="/privacy" element={ // Add this block
        <React.Suspense fallback={<LazyRouteFallback />}>
          <PrivacyPolicy />
        </React.Suspense>
      } />
      <Route path="/epub-to-audiobook" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <EpubToAudiobook />
        </React.Suspense>
      } />
      {/* <Route path="/ai-pdf-reader" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <AIPDFReader />
        </React.Suspense>
      } /> */}
      <Route path="/speechify-alternative" element={
        <React.Suspense fallback={<LazyRouteFallback />}>
          <SpeechifyAlternative />
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
            <ReaderSettingsProvider>
              <TTSProvider>
                <GlobalAudioPlayer />
                <MiniPlayer />
                <SubscriptionProvider>
                  <AppContent />
                  <ToastWrapper />
                </SubscriptionProvider>
              </TTSProvider>
            </ReaderSettingsProvider>
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