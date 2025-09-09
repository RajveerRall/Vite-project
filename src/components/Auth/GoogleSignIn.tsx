import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import './GoogleSignIn.css';

// Define the Google credential response type
interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

// Declare global Google type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ onSuccess, onError }) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to handle Google sign-in
  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      console.log("Google credential response received");
      
      if (!response.credential) {
        throw new Error("Invalid credential received from Google");
      }
      
      console.log("Authenticating with Supabase using Google token");
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });
      
      if (error) {
        console.error("Error signing in with Google:", error);
        onError?.(new Error(`Google sign-in failed: ${error.message}`));
        return;
      }
      
      if (!data.user) {
        console.error("No user data returned from Supabase");
        onError?.(new Error("Failed to retrieve user data after Google sign-in"));
        return;
      }
      
      console.log("Successfully signed in with Google:", {
        id: data.user.id,
        email: data.user.email,
        provider: data.user.app_metadata.provider
      });
      
      onSuccess?.();
    } catch (error) {
      console.error("Exception during Google sign-in:", error);
      onError?.(error instanceof Error ? error : new Error("Unknown error during Google sign-in"));
    }
  };
  
  useEffect(() => {
    // Load the Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  const initializeGoogleSignIn = () => {
    setIsLoading(false);
    if (window.google && googleButtonRef.current) {
      // Get your client ID from environment variable
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error("Google Client ID not found. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.");
        return;
      }
      
      // Only log in development mode
      if (import.meta.env.DEV) {
        console.log("Current origin:", window.location.origin);
        console.log("Make sure this origin is added to your Google Cloud Console authorized origins");
        console.log("Initializing Google Sign-In with Client ID:", clientId.substring(0, 8) + "..." + clientId.substring(clientId.length - 4));
      }
      
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        // Disable FedCM to use traditional OAuth flow
        use_fedcm_for_prompt: false,
      });
      
      // Render the Google Sign In button
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: googleButtonRef.current.offsetWidth,
        // Add additional options to help with origin issues
        ux_mode: 'popup',
      });
      
      // Apply custom styling to the Google button container
      const buttonContainer = googleButtonRef.current.querySelector('div[role="button"]');
      if (buttonContainer) {
        buttonContainer.classList.add('google-sign-in-button');
      }
      
      // Disable One Tap UI for now to avoid origin issues
      // window.google.accounts.id.prompt();
    }
  };
  
  return (
    <div className="google-sign-in-container">
      {isLoading ? (
        <div className="flex justify-center items-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
          <span className="ml-2 text-sm text-gray-600">Loading Google Sign-In...</span>
        </div>
      ) : (
        <div ref={googleButtonRef} className="w-full flex justify-center"></div>
      )}
    </div>
  );
};

export default GoogleSignIn;
