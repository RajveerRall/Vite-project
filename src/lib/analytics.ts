// src/lib/analytics.ts

// This interface makes it clear what we can send to Google Analytics.
interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Safe check for analytics availability
 */
const isAnalyticsAvailable = {
  gtag: () => typeof window !== 'undefined' && typeof window.gtag === 'function',
  dataLayer: () => typeof window !== 'undefined' && Array.isArray(window.dataLayer),
  amplitude: () => typeof window !== 'undefined' && window.amplitude && typeof window.amplitude.track === 'function'
};

/**
 * Sends a custom event to both Google Analytics and Amplitude.
 * This provides comprehensive analytics coverage.
 * @param eventName The name of the event (e.g., 'add_book').
 * @param eventParams Optional parameters providing context (e.g., { method: 'upload' }).
 */
export const trackEvent = (eventName: string, eventParams?: EventParams) => {
  // Track in Google Analytics
  if (isAnalyticsAvailable.gtag()) {
    try {
      console.log(`[Analytics] Tracking Event in GA: ${eventName}`, eventParams || '');
      window.gtag('event', eventName, eventParams);
    } catch (error) {
      console.warn(`[Analytics] GA tracking failed for "${eventName}":`, error);
    }
  } else {
    console.warn(`[Analytics] gtag not found. Event "${eventName}" was not tracked in GA.`);
  }

  // Track in Google Tag Manager
  if (isAnalyticsAvailable.dataLayer()) {
    try {
      console.log(`[Analytics] Tracking Event in GTM: ${eventName}`, eventParams || '');
      window.dataLayer.push({
        event: eventName,
        ...eventParams
      });
    } catch (error) {
      console.warn(`[Analytics] GTM tracking failed for "${eventName}":`, error);
    }
  } else {
    console.warn(`[Analytics] dataLayer not found. Event "${eventName}" was not tracked in GTM.`);
  }

  // Track in Amplitude
  if (isAnalyticsAvailable.amplitude()) {
    try {
      console.log(`[Analytics] Tracking Event in Amplitude: ${eventName}`, eventParams || '');
      window.amplitude.track(eventName, eventParams);
    } catch (error) {
      console.warn(`[Analytics] Amplitude tracking failed for "${eventName}":`, error);
    }
  } else {
    console.warn(`[Analytics] Amplitude not found. Event "${eventName}" was not tracked in Amplitude.`);
  }
};

/**
 * Set user properties in Amplitude (useful for user segmentation)
 * @param properties Object containing user properties
 */
export const setUserProperties = (properties: Record<string, any>) => {
  if (isAnalyticsAvailable.amplitude()) {
    try {
      console.log(`[Analytics] Setting Amplitude user properties:`, properties);
      window.amplitude.setUserProperties(properties);
    } catch (error) {
      console.warn(`[Analytics] Failed to set Amplitude user properties:`, error);
    }
  } else {
    console.warn(`[Analytics] Amplitude not found. User properties not set.`);
  }
};

/**
 * Identify a user in Amplitude (useful for user tracking)
 * @param userId Unique identifier for the user
 * @param userProperties Optional user properties
 */
export const identifyUser = (userId: string, userProperties?: Record<string, any>) => {
  if (isAnalyticsAvailable.amplitude()) {
    try {
      console.log(`[Analytics] Identifying user in Amplitude: ${userId}`, userProperties || '');
      window.amplitude.setUserId(userId);
      if (userProperties) {
        window.amplitude.setUserProperties(userProperties);
      }
    } catch (error) {
      console.warn(`[Analytics] Failed to identify user in Amplitude:`, error);
    }
  } else {
    console.warn(`[Analytics] Amplitude not found. User identification failed.`);
  }
};

/**
 * Track page views in Amplitude
 * @param pageName Name of the page
 * @param pageProperties Optional page properties
 */
export const trackPageView = (pageName: string, pageProperties?: Record<string, any>) => {
  if (isAnalyticsAvailable.amplitude()) {
    try {
      console.log(`[Analytics] Tracking page view in Amplitude: ${pageName}`, pageProperties || '');
      window.amplitude.track('Page View', {
        page_name: pageName,
        ...pageProperties
      });
    } catch (error) {
      console.warn(`[Analytics] Failed to track page view in Amplitude:`, error);
    }
  } else {
    console.warn(`[Analytics] Amplitude not found. Page view not tracked.`);
  }
};

/**
 * Send a test event to verify Amplitude is working
 */
export const sendTestEvent = () => {
  if (isAnalyticsAvailable.amplitude()) {
    try {
      console.log('[Analytics] Sending test event to Amplitude');
      window.amplitude.track('amplitude_test', {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        platform: 'web'
      });
    } catch (error) {
      console.warn('[Analytics] Failed to send test event to Amplitude:', error);
    }
  } else {
    console.warn('[Analytics] Amplitude not found. Test event not sent.');
  }
};

/**
 * Push custom data to Google Tag Manager dataLayer
 * @param data Object to push to dataLayer
 */
export const pushToDataLayer = (data: Record<string, any>) => {
  if (isAnalyticsAvailable.dataLayer()) {
    try {
      console.log(`[Analytics] Pushing to GTM dataLayer:`, data);
      window.dataLayer.push(data);
    } catch (error) {
      console.warn(`[Analytics] Failed to push to GTM dataLayer:`, error);
    }
  } else {
    console.warn(`[Analytics] dataLayer not found. Data not pushed to GTM.`);
  }
};

/**
 * Track custom events specifically for GTM
 * @param eventName Name of the event
 * @param eventParams Event parameters
 */
export const trackGTMEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (isAnalyticsAvailable.dataLayer()) {
    try {
      console.log(`[Analytics] Tracking GTM Event: ${eventName}`, eventParams || '');
      window.dataLayer.push({
        event: eventName,
        ...eventParams
      });
    } catch (error) {
      console.warn(`[Analytics] Failed to track GTM event:`, error);
    }
  } else {
    console.warn(`[Analytics] dataLayer not found. GTM event not tracked.`);
  }
};

/**
 * Check analytics status and log availability
 */
export const logAnalyticsStatus = () => {
  console.log('[Analytics] Status Check:', {
    gtag: isAnalyticsAvailable.gtag(),
    dataLayer: isAnalyticsAvailable.dataLayer(),
    amplitude: isAnalyticsAvailable.amplitude()
  });
};

/**
 * Initialize analytics with error handling
 */
export const initializeAnalytics = () => {
  try {
    logAnalyticsStatus();
    
    // Send test events to verify everything is working
    if (isAnalyticsAvailable.gtag()) {
      console.log('[Analytics] Google Analytics is available');
    }
    
    if (isAnalyticsAvailable.dataLayer()) {
      console.log('[Analytics] Google Tag Manager is available');
    }
    
    if (isAnalyticsAvailable.amplitude()) {
      console.log('[Analytics] Amplitude is available');
      // Send a test event
      sendTestEvent();
    } else {
      console.warn('[Analytics] Amplitude is not available - may be blocked by ad blocker');
    }
  } catch (error) {
    console.error('[Analytics] Initialization failed:', error);
  }
};