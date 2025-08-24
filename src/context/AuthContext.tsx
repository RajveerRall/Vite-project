import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { supabase } = await import('../lib/supabase');
      // Use unique timer name to avoid conflicts in development
      const timerName = `[Perf] supabase.getSession-${Date.now()}`;
      console.time(timerName);
      const { data: { session } } = await supabase.auth.getSession();
      console.timeEnd(timerName);
      setUser(session?.user ?? null);
      
      // Identify user in Amplitude if they're already signed in
      if (session?.user) {
        identifyUser(session.user.id, {
          user_id: session.user.id,
          email: session.user.email,
          sign_in_method: 'existing_session',
          platform: 'web',
          auth_event: 'initial_session',
          timestamp: new Date().toISOString()
        });
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    let unsubscribe: (() => void) | null = null;
    (async () => {
      const { supabase } = await import('../lib/supabase');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null);
          
          // Identify user in Amplitude when they sign in
          if (session?.user) {
            identifyUser(session.user.id, {
              user_id: session.user.id,
              email: session.user.email,
              sign_in_method: 'email',
              platform: 'web',
              auth_event: event,
              timestamp: new Date().toISOString()
            });
          }
          
          setLoading(false);
        }
      );
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 