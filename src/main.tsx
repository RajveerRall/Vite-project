import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { sendTestEvent } from './lib/analytics';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { isTrackingEnabled } from './utils/trackingConfig';
import { PostHogProvider } from 'posthog-js/react';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true,
        debug: import.meta.env.MODE === 'development',
      }}
    >
      <GoogleOAuthProvider clientId={clientId}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </PostHogProvider>
  </React.StrictMode>
);

// Send test event to verify Amplitude is working (only if tracking is enabled)
if (isTrackingEnabled()) {
  setTimeout(() => {
    sendTestEvent();
  }, 2000); // Wait 2 seconds for Amplitude to initialize
} else {
  console.log('[Main] Tracking disabled - skipping test event');
}

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>
// );