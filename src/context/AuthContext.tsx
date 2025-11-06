import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { identifyUser } from '../lib/analytics';
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
  const [hasExplicitlySignedOut, setHasExplicitlySignedOut] = useState(() => {
    return localStorage.getItem(SIGN_OUT_FLAG_KEY) === 'true';
  });
  
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

  /**
   * Ensure user has a DodoPayments customer ID
   * Uses Edge Function to create customer in DodoPayments if needed
   * Includes retry logic and better error handling
   */
  const ensureDodoPaymentsCustomer = useCallback(async (user: User, retryCount: number = 0): Promise<void> => {
    if (!user?.email || !user?.id) {
      console.warn('[AuthContext] Missing user email or ID for customer creation');
      return;
    }

    const MAX_RETRIES = 2;

    try {
      // Use Edge Function to create user/customer
      const { api } = await import('../services/api');
      
      console.log('[AuthContext] Creating DodoPayments customer via Edge Function for user:', user.email);
      
      const response = await api.post<{ success: boolean; customer_id: string }>('/subscriptions', { action: 'create-user' });

      if (response.error) {
        console.warn('[AuthContext] Failed to create DodoPayments customer:', response.error);
        
        // Retry customer creation if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          console.log(`[AuthContext] Retrying customer creation (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return ensureDodoPaymentsCustomer(user, retryCount + 1);
        }
        return;
      }

      if (response.data?.success && response.data.customer_id) {
        console.log('[AuthContext] Successfully created DodoPayments customer:', {
          customerId: response.data.customer_id,
          userId: user.id,
        });
      }
    } catch (error: any) {
      // Don't throw - customer creation shouldn't break authentication
      console.error('[AuthContext] Error ensuring DodoPayments customer:', {
        error: error?.message,
        stack: error?.stack,
        userId: user.id,
        retryCount,
      });
      
      // Retry on network errors
      if (retryCount < MAX_RETRIES && (error?.message?.includes('network') || error?.message?.includes('timeout'))) {
        console.log(`[AuthContext] Retrying customer creation after network error (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return ensureDodoPaymentsCustomer(user, retryCount + 1);
      }
    }
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
        
        // ========================================
        // NEW: ENSURE DODOPAYMENTS CUSTOMER
        // ========================================
        // Create customer in DodoPayments if needed (fire-and-forget, non-blocking)
        ensureDodoPaymentsCustomer(data.user).catch((error) => {
          console.warn('[AuthContext] Failed to ensure DodoPayments customer (non-critical):', error);
        });
        
        // ========================================
        // NEW: CONVERT ANONYMOUS SESSION
        // ========================================
        try {
          const { getSessionStatus, markSessionAsConverted } = await import('../utils/anonymousSession');
          const { hasSession, sessionId } = getSessionStatus();
          
          if (hasSession && sessionId) {
            console.log('[Auth] Converting anonymous session to user:', sessionId);
            
            const { data: conversionData, error: conversionError } = await supabase.rpc(
              'convert_anonymous_to_user',
              {
                p_session_id: sessionId,
                p_user_id: data.user.id
              }
            );
            
            if (conversionError) {
              console.warn('[Auth] Failed to convert anonymous session:', conversionError);
            } else {
              console.log('[Auth] Successfully converted anonymous usage:', conversionData);
              markSessionAsConverted();
            }
          }
        } catch (conversionErr) {
          console.warn('[Auth] Error during session conversion:', conversionErr);
        }
        
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
  
  // Subscribe to Supabase auth state changes so UI stays in sync (Google, email, etc.)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    (async () => {
      try {
        // First, get initial session to determine auth state immediately
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        // Check if user explicitly signed out before processing session
        const explicitlySignedOut = localStorage.getItem(SIGN_OUT_FLAG_KEY) === 'true';
        if (explicitlySignedOut && initialSession?.user) {
          // User explicitly signed out - clear the session
          console.log('[AuthContext] Explicit sign-out detected, clearing session...');
          await supabase.auth.signOut();
          setUser(null);
          setAuthInitialized(true);
          return; // Exit early - don't process session
        }

        if (initialSession?.user) {
          setUser(initialSession.user);
        }
        // Mark as initialized after initial check
        setAuthInitialized(true);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          // Wrap entire callback in try-catch to prevent crashes
          try {
            console.log('[AuthContext] onAuthStateChange:', event, session);
            
            // CRITICAL: If user explicitly signed out, reject any auto sign-in attempts
            // Read from localStorage directly to get the current value (not stale closure)
            const explicitlySignedOut = localStorage.getItem(SIGN_OUT_FLAG_KEY) === 'true';
            if (event === 'SIGNED_IN' && explicitlySignedOut) {
              console.warn('[AuthContext] ⚠️ Auto sign-in detected after explicit sign-out - rejecting and signing out immediately');
              // Immediately sign out to prevent auto-login
              try {
                await supabase.auth.signOut();
                console.log('[AuthContext] Successfully rejected auto sign-in and signed out');
              } catch (signOutError) {
                console.error('[AuthContext] Failed to sign out after rejecting auto sign-in:', signOutError);
              }
              // Don't update user state - keep them signed out
              setAuthInitialized(true);
              return; // Exit early - don't process this sign-in event
            }
            
            const nextUser = session?.user ?? null;
            setUser(nextUser);
            setAuthInitialized(true);
            
            if (event === 'SIGNED_OUT') {
              // Don't set the flag here - it should only be set by explicit signOut()
              // This event can fire for session expiry, not just user action
              console.log('[AuthContext] SIGNED_OUT event - not setting explicit flag');
            } else if (nextUser) {
              // ✅ FIXED: Check if user explicitly signed out before processing conversion
              // Read from localStorage directly to get the current value (not stale closure)
              const explicitlySignedOut = localStorage.getItem(SIGN_OUT_FLAG_KEY) === 'true';
              if (explicitlySignedOut) {
                console.log('[AuthContext] User explicitly signed out - skipping anonymous session conversion and DodoPayments setup');
                // Clear user state since user wants to stay signed out
                setUser(null);
                // Don't process conversion - user wants to stay signed out
                return; // Exit early - don't process conversion
              }
              
              // User signed in - clear the flag (only reached if hasExplicitlySignedOut was false)
              // This means it was an explicit sign-in (not auto-triggered) or the flag was already cleared
              localStorage.removeItem(SIGN_OUT_FLAG_KEY);
              setHasExplicitlySignedOut(false);
              
              // ========================================
              // NEW: ENSURE DODOPAYMENTS CUSTOMER (for OAuth flows)
              // ========================================
              ensureDodoPaymentsCustomer(nextUser).catch((error) => {
                console.warn('[AuthContext] Failed to ensure DodoPayments customer (non-critical):', error);
              });
              
              // ========================================
              // NEW: CONVERT ANONYMOUS SESSION (for OAuth flows)
              // ========================================
              try {
                const { getSessionStatus, markSessionAsConverted } = await import('../utils/anonymousSession');
                const { hasSession, sessionId } = getSessionStatus();
                
                if (hasSession && sessionId) {
                  console.log('[Auth] Converting anonymous session to user (OAuth):', sessionId);
                  
                  const { data: conversionData, error: conversionError } = await supabase.rpc(
                    'convert_anonymous_to_user',
                    {
                      p_session_id: sessionId,
                      p_user_id: nextUser.id
                    }
                  );
                  
                  if (conversionError) {
                    console.warn('[Auth] Failed to convert anonymous session (OAuth):', conversionError);
                  } else {
                    console.log('[Auth] Successfully converted anonymous usage (OAuth):', conversionData);
                    markSessionAsConverted();
                  }
                }
              } catch (conversionErr) {
                console.warn('[Auth] Error during session conversion (OAuth):', conversionErr);
              }
            }
          } catch (error) {
            // Error boundary: catch any errors in the auth state change callback
            // This prevents the entire app from crashing if something goes wrong
            console.error('[AuthContext] Error in onAuthStateChange callback:', error);
            // Don't throw - keep the app running even if auth state change fails
            setAuthInitialized(true); // Still mark as initialized even on error
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch (error) {
        console.error('[AuthContext] Failed to subscribe to auth state changes:', error);
        setAuthInitialized(true); // Mark as initialized even if subscription fails
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