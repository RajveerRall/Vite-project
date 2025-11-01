import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { sendTestEvent } from './lib/analytics';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { isTrackingEnabled } from './utils/trackingConfig';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
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