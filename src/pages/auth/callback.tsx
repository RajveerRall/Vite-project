import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { identifyUser } from '../../lib/analytics';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Reusable auth callback handler
  const handleAuthCallback = useCallback(async () => {
    try {
      // First handle implicit hash tokens (#access_token, #refresh_token)
      const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data: setData, error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setErr) throw setErr;
        if (setData?.session?.user) {
          identifyUser(setData.session.user.id, {
            user_id: setData.session.user.id,
            email: setData.session.user.email,
            sign_in_method: 'google',
            platform: 'web',
            auth_event: 'oauth_callback_hash',
            timestamp: new Date().toISOString()
          });
          // Clean URL (remove hash)
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          navigate('/');
          return;
        }
      }

      // Next handle PKCE code flow if present (?code=)
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        // exchangeCodeForSession processes the full URL
        // Add timeout protection
        const exchangePromise = (supabase.auth as any).exchangeCodeForSession(window.location.href);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session exchange timeout after 10 seconds')), 10000);
        });
        
        const { data: exData, error: exErr } = await Promise.race([
          exchangePromise,
          timeoutPromise
        ]) as any;
        
        if (exErr) throw exErr;
        if (exData?.session?.user) {
          identifyUser(exData.session.user.id, {
            user_id: exData.session.user.id,
            email: exData.session.user.email,
            sign_in_method: 'google',
            platform: 'web',
            auth_event: 'oauth_callback_code',
            timestamp: new Date().toISOString()
          });
          navigate('/');
          return;
        }
      }

      // Fallback: check current session safely with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 5000);
      });
      
      const { data: sessionData, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (sessionData?.session?.user) {
        // Identify user in analytics
        identifyUser(sessionData.session.user.id, {
          user_id: sessionData.session.user.id,
          email: sessionData.session.user.email,
          sign_in_method: 'google',
          platform: 'web',
          auth_event: 'oauth_callback',
          timestamp: new Date().toISOString()
        });
        
        // Redirect to home page or wherever you want
        navigate('/');
      } else {
        throw new Error('No user data found in session');
      }
    } catch (err: any) {
      console.error('Error during auth callback:', err);
      setError(err.message || 'Failed to sign in with Google');
      // Don't auto-redirect on error - let user decide what to do
    }
  }, [navigate]);

  useEffect(() => {
    handleAuthCallback();
  }, [handleAuthCallback]);

  const handleRetry = () => {
    setError(null);
    handleAuthCallback();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Go Home
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Signing you in...</h2>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
