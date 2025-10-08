import React, { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface GoogleOneTapProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const GoogleOneTap: React.FC<GoogleOneTapProps> = ({ onSuccess, onError }) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    const initializeOneTap = () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const googleAny = (window as any).google;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || !googleAny?.accounts?.id) {
        console.warn('[GoogleOneTap] Missing client ID or Google API not available');
        return;
      }

      googleAny.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            const token = response?.credential;
            if (!token) throw new Error('No credential received from Google One Tap');
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token
            });
            if (error) throw error;
            onSuccess?.();
          } catch (err: any) {
            console.error('[GoogleOneTap] Sign-in failed', err);
            onError?.(err instanceof Error ? err : new Error('Unknown error during Google One Tap sign-in'));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true
      });

      // Show the One Tap prompt (Google controls positioning; typically top-right)
      googleAny.accounts.id.prompt((notification: any) => {
        // Optional: observe reasons it might not display
        // console.log('[GoogleOneTap] prompt notification', notification);
      });
    };

    if ((window as any).google?.accounts?.id) {
      initializeOneTap();
      return;
    }

    const existing = document.getElementById('google-identity-services');
    if (existing) {
      existing.addEventListener('load', initializeOneTap as any);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeOneTap;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [onSuccess, onError]);

  return null;
};

export default React.memo(GoogleOneTap);


