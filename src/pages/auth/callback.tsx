import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { identifyUser } from '../../lib/analytics';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Process the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data?.session?.user) {
          // Identify user in analytics
          identifyUser(data.session.user.id, {
            user_id: data.session.user.id,
            email: data.session.user.email,
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
        // Still redirect after a delay to avoid getting stuck
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-gray-500">Redirecting you back...</p>
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
