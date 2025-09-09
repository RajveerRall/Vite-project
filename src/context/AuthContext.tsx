import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { identifyUser } from '../lib/analytics';
// import { supabase } from '../lib/supabase';

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
  const [hasExplicitlySignedOut, setHasExplicitlySignedOut] = useState(false);

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
        setHasExplicitlySignedOut(false); // Reset the sign out flag
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
        setHasExplicitlySignedOut(false); // Reset the sign out flag
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

  const signOut = async () => {
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      
      console.log('[AuthContext] Starting sign out process...');
      
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
      setHasExplicitlySignedOut(true);
      
      // Force a page refresh to clear any remaining Supabase session state
      console.log('[AuthContext] Forcing page refresh to clear session state...');
      window.location.reload();
      
      console.log('[AuthContext] Successfully signed out (local state cleared)');
    } catch (error) {
      console.error('[AuthContext] Sign out failed:', error);
      // Even if there's an error, clear the user state to ensure logout
      setUser(null);
      setAuthInitialized(false);
      setHasExplicitlySignedOut(true);
      // Still force refresh on error
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  // *** REMOVED: Auto-initialization on mount to prevent auto-sign-in ***
  // The checkExistingSession will only be called when explicitly needed
  // (e.g., when user clicks Sign In button)
  
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 