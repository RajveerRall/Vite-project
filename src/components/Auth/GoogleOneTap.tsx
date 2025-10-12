import React from 'react';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import { supabase } from '../../lib/supabase';

interface GoogleOneTapProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const GoogleOneTap: React.FC<GoogleOneTapProps> = ({ onSuccess, onError }) => {
  console.log('[GoogleOneTap] Component mounted - initializing One Tap...');
  
  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      console.log('[GoogleOneTap] Credential received:', credentialResponse);
      
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google One Tap');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential
      });
      
      if (error) throw error;
      
      console.log('[GoogleOneTap] Successfully signed in with Supabase');
      onSuccess?.();
    } catch (err: any) {
      console.error('[GoogleOneTap] Sign-in failed:', err);
      onError?.(err instanceof Error ? err : new Error('Unknown error during Google One Tap sign-in'));
    }
  };

  const handleLoginError = () => {
    console.log('[GoogleOneTap] One Tap login failed or was dismissed');
    // Don't call onError here as dismissal is normal behavior
  };

  // This hook automatically triggers the One Tap prompt on component mount
  useGoogleOneTapLogin({
    onSuccess: handleLoginSuccess,
    onError: handleLoginError,
  });

  return null;
};

export default React.memo(GoogleOneTap);


