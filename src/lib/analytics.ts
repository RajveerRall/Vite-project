// src/lib/analytics.ts

// This interface makes it clear what we can send to Google Analytics.
interface EventParams {
  [key: string]: string | number | undefined;
}

/**
 * Sends a custom event to Google Analytics.
 * This is a wrapper around the global gtag function provided by Google's script.
 * @param eventName The name of the event (e.g., 'add_book').
 * @param eventParams Optional parameters providing context (e.g., { method: 'upload' }).
 */
export const trackEvent = (eventName: string, eventParams?: EventParams) => {
  // Check if the gtag function is available on the window object.
  // This prevents errors if the GA script hasn't loaded or is blocked.
  if (window.gtag) {
    console.log(`[Analytics] Tracking Event: ${eventName}`, eventParams || '');
    window.gtag('event', eventName, eventParams);
  } else {
    console.warn(`[Analytics] gtag not found. Event "${eventName}" was not tracked.`);
  }
};