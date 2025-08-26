import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { identifyUser } from '../lib/analytics';
// import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  checkExistingSession: () => Promise<void>; // For session checks only
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

  // *** FIXED: Only check for existing session, don't auto-sign in ***
  const checkExistingSession = useCallback(async () => {
    if (authInitialized) return;
    
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        // Identify user in Amplitude if they're already signed in
        identifyUser(session.user.id, {
          user_id: session.user.id,
          email: session.user.email,
          sign_in_method: 'existing_session',
          platform: 'web',
          auth_event: 'initial_session',
          timestamp: new Date().toISOString()
        });
      }
      
      setAuthInitialized(true);
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [authInitialized]);

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

  const signOut = async () => {
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // *** FIXED: Initialize auth on mount to check for existing session ***
  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
    checkExistingSession, // Expose this for manual session checks
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 