import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { identifyUser } from '../lib/analytics';
// import { supabase } from '../lib/supabase';

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
  const [hasExplicitlySignedOut, setHasExplicitlySignedOut] = useState(() => {
    return localStorage.getItem(SIGN_OUT_FLAG_KEY) === 'true';
  });

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
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('[AuthContext] Found existing session for user:', session.user.email);
        setUser(session.user);
        // Clear the sign-out flag from localStorage
        localStorage.removeItem(SIGN_OUT_FLAG_KEY);
        setHasExplicitlySignedOut(false);
        // Identify user in Amplitude if they're already signed in
        identifyUser(session.user.id, {
          user_id: session.user.id,
          email: session.user.email,
          sign_in_method: 'existing_session',
          platform: 'web',
          auth_event: 'initial_session',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('[AuthContext] No existing session found');
      }
      
      setAuthInitialized(true);
    } catch (error) {
      console.error('[AuthContext] Session check failed:', error);
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
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.user) {
        setUser(data.user);
        // Clear the sign-out flag from localStorage
        localStorage.removeItem(SIGN_OUT_FLAG_KEY);
        setHasExplicitlySignedOut(false);
        // Identify user in Amplitude
        identifyUser(data.user.id, {
          user_id: data.user.id,
          email: data.user.email,
          sign_in_method: 'email',
          platform: 'web',
          auth_event: 'sign_in',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // We're now using Google's pre-built sign-in buttons
  // This method is kept for backward compatibility but is no longer used
  const signInWithGoogle = async () => {
    console.warn('signInWithGoogle is deprecated. Please use the GoogleSignIn component instead.');
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
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
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      
      console.log('[AuthContext] Starting sign out process...');
      
      // CRITICAL: Set flag in localStorage BEFORE page reload
      localStorage.setItem(SIGN_OUT_FLAG_KEY, 'true');
      setHasExplicitlySignedOut(true);
      console.log('[AuthContext] Sign-out flag persisted to localStorage');
      
      // Try to sign out from Supabase, but don't fail if session is missing
      try {
        console.log('[AuthContext] Calling Supabase auth.signOut()...');
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('[AuthContext] Supabase signOut returned error (this is usually OK):', error);
        } else {
          console.log('[AuthContext] Supabase signOut successful');
        }
      } catch (signOutError) {
        // If signOut fails (e.g., session missing), that's fine - we just want to clear local state
        console.warn('[AuthContext] Supabase signOut failed (session may already be expired):', signOutError);
      }
      
      // Always clear local state regardless of Supabase response
      console.log('[AuthContext] Clearing local auth state...');
      setUser(null);
      setAuthInitialized(false);
      
      // NEW: Clear books from IndexedDB before reload
      console.log('[AuthContext] Clearing books before reload...');
      await clearBooksOnSignOut();
      
      // Force a page refresh to clear any remaining Supabase session state
      // The flag will persist through the reload and trigger cleanup
      console.log('[AuthContext] Forcing page refresh to clear session state...');
      window.location.reload();
      
      console.log('[AuthContext] Successfully signed out (local state cleared)');
    } catch (error) {
      console.error('[AuthContext] Sign out failed:', error);
      // Even if there's an error, clear the user state and set the flag
      localStorage.setItem(SIGN_OUT_FLAG_KEY, 'true');
      setUser(null);
      setAuthInitialized(false);
      setHasExplicitlySignedOut(true);
      
      // NEW: Clear books even on error
      console.log('[AuthContext] Clearing books on error...');
      await clearBooksOnSignOut();
      
      // Still force refresh on error
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  // *** REMOVED: Auto-initialization on mount to prevent auto-sign-in ***
  // The checkExistingSession will only be called when explicitly needed
  // (e.g., when user clicks Sign In button)
  
  // Subscribe to Supabase auth state changes so UI stays in sync (Google, email, etc.)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[AuthContext] onAuthStateChange:', event, session);
          const nextUser = session?.user ?? null;
          setUser(nextUser);
          setAuthInitialized(true);
          if (event === 'SIGNED_OUT') {
            // Don't set the flag here - it should only be set by explicit signOut()
            // This event can fire for session expiry, not just user action
            console.log('[AuthContext] SIGNED_OUT event - not setting explicit flag');
          } else if (nextUser) {
            // User signed in - clear the flag
            localStorage.removeItem(SIGN_OUT_FLAG_KEY);
            setHasExplicitlySignedOut(false);
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch (error) {
        console.error('[AuthContext] Failed to subscribe to auth state changes:', error);
      }
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
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