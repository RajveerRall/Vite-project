import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ onSuccess, onError }) => {
  const { resetSignOutState } = useAuth();
  
  const handleCredentialResponse = async (credentialResponse: any) => {
    try {
      console.log('[GoogleSignIn] Credential received:', credentialResponse);
      
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }
      
      // Clear sign-out flag BEFORE authentication attempt to allow explicit sign-in
      // This prevents onAuthStateChange from rejecting the SIGNED_IN event
      resetSignOutState();
      console.log('[GoogleSignIn] Cleared sign-out flag before authentication');
      
      console.log('[GoogleSignIn] Authenticating with Supabase using Google token');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });
      
      if (error) {
        console.error('[GoogleSignIn] Error signing in with Google:', error);
        onError?.(new Error(`Google sign-in failed: ${error.message}`));
        return;
      }
      
      if (!data.user) {
        console.error('[GoogleSignIn] No user data returned from Supabase');
        onError?.(new Error('Failed to retrieve user data after Google sign-in'));
        return;
      }
      
      console.log('[GoogleSignIn] Successfully signed in with Google:', {
        id: data.user.id,
        email: data.user.email,
        provider: data.user.app_metadata.provider
      });
      
      onSuccess?.();
    } catch (error) {
      console.error('[GoogleSignIn] Exception during Google sign-in:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error during Google sign-in'));
    }
  };

  const handleError = () => {
    console.log('[GoogleSignIn] Google sign-in failed or was cancelled');
    onError?.(new Error('Google sign-in was cancelled or failed'));
  };

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleCredentialResponse}
        onError={handleError}
        useOneTap={false}
        width="320"
        shape="pill"
        theme="outline"
        text="signin_with"
        logo_alignment="left"
      />
    </div>
  );
};

export default React.memo(GoogleSignIn);
