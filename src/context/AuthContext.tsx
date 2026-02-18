import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getSessionSafely } from '../lib/authToken';

// LocalStorage key for persisting sign-out flag across page reloads
const SIGN_OUT_FLAG_KEY = 'yoread_explicit_signout';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  authInitialized: boolean; // Track if auth state has been determined
  checkExistingSession: () => Promise<void>; // For session checks only
  resetSignOutState: () => void; // Reset the explicit sign out flag
  hasExplicitlySignedOut: boolean; // Track if user explicitly signed out
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  // Initialize from localStorage to persist across page reloads
  const [hasExplicitlySignedOut, setHasExplicitlySignedOut] = useState(false);

  // MOCK USER for Free Usage
  const mockUser: User = {
    id: 'guest-user-123',
    email: 'guest@yoread.app',
    app_metadata: {},
    user_metadata: { full_name: 'Guest User' },
    aud: 'authenticated',
    created_at: new Date().toISOString()
  };

  // Guard against multiple simultaneous sign-out calls
  const isSigningOutRef = useRef(false);

  // *** FIXED: Only check for existing session, don't auto-sign in ***
  const checkExistingSession = useCallback(async () => {
    console.log('[AuthContext] checkExistingSession called - this should only happen manually');

    if (authInitialized) {
      console.log('[AuthContext] Already initialized, skipping');
      return;
    }

    // Don't check for existing session if user has explicitly signed out
    if (hasExplicitlySignedOut) {
      console.log('[AuthContext] Skipping session check - user explicitly signed out');
      setAuthInitialized(true);
      return;
    }

    console.log('[AuthContext] Checking for existing Supabase session...');
    setLoading(true);
    try {
      // Use localStorage-first approach - just check if token exists
      // Don't call getSession() again - onAuthStateChange will handle setting the user
      const { session } = await getSessionSafely(5000);

      if (session?.access_token) {
        // We have a token, so user is authenticated
        // Don't call getSession() or getUser() again - onAuthStateChange will handle it
        // Just mark as initialized and let the auth state listener set the user
        console.log('[AuthContext] Token found - user is authenticated (will be set by onAuthStateChange)');
        localStorage.removeItem(SIGN_OUT_FLAG_KEY);
        setHasExplicitlySignedOut(false);
      } else {
        console.log('[AuthContext] No existing session found');
      }

      setAuthInitialized(true);
    } catch (error) {
      console.error('[AuthContext] Session check failed:', error);
      setAuthInitialized(true); // Set initialized even on error to prevent hanging
    } finally {
      setLoading(false);
    }
  }, [authInitialized, hasExplicitlySignedOut]);

  // Function to reset the explicit sign out state
  const resetSignOutState = useCallback(() => {
    localStorage.removeItem(SIGN_OUT_FLAG_KEY);
    setHasExplicitlySignedOut(false);
    console.log('[AuthContext] Sign out state reset - session checks will now work');
  }, []);



  // *** FIXED: Sign up without checking existing session ***
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Don't set user here - wait for email verification
      console.log('Sign up successful. Please check your email for verification.');
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // *** FIXED: Sign in with proper session handling ***
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // CRITICAL: Clear sign-out flag SYNCHRONOUSLY before any async operations
      // This prevents race conditions where onAuthStateChange might check the flag
      // before we've cleared it, causing legitimate sign-ins to be rejected
      localStorage.removeItem(SIGN_OUT_FLAG_KEY);
      setHasExplicitlySignedOut(false);
      console.log('[AuthContext] Cleared sign-out flag before email/password sign-in');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Skip actual Supabase check and use mock user
  useEffect(() => {
    setUser(mockUser);
    setAuthInitialized(true);
  }, []);

  // We're now using Google's pre-built sign-in buttons
  // This method is kept for backward compatibility but is no longer used
  const signInWithGoogle = async () => {
    console.warn('signInWithGoogle is deprecated. Please use the GoogleSignIn component instead.');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to clear books from IndexedDB before reload
  const clearBooksOnSignOut = async () => {
    try {
      const localforage = (await import('localforage')).default;
      const allKeys = await localforage.keys();

      // Remove all book keys except the default book
      const bookKeys = allKeys.filter(key =>
        key.includes('book_metadata_') || key.includes('book_file_')
      );

      for (const key of bookKeys) {
        // Preserve the default book
        if (key.includes('default-book-1984')) {
          continue;
        }
        await localforage.removeItem(key);
      }

      console.log('[AuthContext] Books cleared before reload');
    } catch (error) {
      console.error('[AuthContext] Error clearing books:', error);
      // Don't throw - we still want to reload even if cleanup fails
    }
  };

  const signOut = async () => {
    // Guard against multiple simultaneous calls
    if (isSigningOutRef.current) {
      console.log('[AuthContext] Sign out already in progress, ignoring...');
      return;
    }

    isSigningOutRef.current = true;

    console.log('[AuthContext] Starting sign out...');

    // CRITICAL: Set flag in localStorage BEFORE signing out
    localStorage.setItem(SIGN_OUT_FLAG_KEY, 'true');
    setHasExplicitlySignedOut(true);

    // IMMEDIATE: Clear local auth state (no waiting)
    setUser(null);
    setAuthInitialized(false);
    setLoading(false);

    try {
      // ✅ FIXED: Clear anonymous session on sign out
      try {
        const { clearAnonymousSession } = await import('../utils/anonymousSession');
        clearAnonymousSession();
        console.log('[AuthContext] Cleared anonymous session');
      } catch (err) {
        console.warn('[AuthContext] Failed to clear anonymous session:', err);
      }

      // IMPORTANT: Sign out from Supabase BEFORE reloading
      // This ensures the session is cleared before page reload
      const { supabase } = await import('../lib/supabase');
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('[AuthContext] Supabase signOut error:', signOutError);
        // Continue with logout even if Supabase signOut fails
      } else {
        console.log('[AuthContext] Successfully signed out from Supabase');
      }

      // Attempt book cleanup (fire-and-forget, don't wait)
      clearBooksOnSignOut().catch((error) => {
        console.warn('[AuthContext] Background book cleanup failed (non-critical):', error);
      });

      // Now reload after Supabase session is cleared
      console.log('[AuthContext] Session cleared, reloading page...');
      window.location.reload();

    } catch (error) {
      console.error('[AuthContext] Error during sign out:', error);
      // Still reload even if there's an error - flag is set so user stays logged out
      window.location.reload();
    } finally {
      // Reset guard (may not execute due to reload, but safe to have)
      isSigningOutRef.current = false;
    }
  };

  // *** REMOVED: Auto-initialization on mount to prevent auto-sign-in ***
  // The checkExistingSession will only be called when explicitly needed
  // (e.g., when user clicks Sign In button)

  useEffect(() => {
    // Auth bypass: no need to subscribe to Supabase events
    return () => { };
  }, []);

  // Log the current auth state for debugging
  useEffect(() => {
    console.log('[AuthContext] Current state:', {
      user: user?.email || 'none',
      isAuthenticated: !!user,
      authInitialized,
      hasExplicitlySignedOut
    });
  }, [user, authInitialized, hasExplicitlySignedOut]);

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
    authInitialized, // Expose authInitialized state
    checkExistingSession, // Expose this for manual session checks
    resetSignOutState, // Expose this for resetting sign out state
    hasExplicitlySignedOut, // Expose this for BookContext to check
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 