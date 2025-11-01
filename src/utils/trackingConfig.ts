/**
 * Utility to determine if tracking should be enabled
 * Disables tracking when running locally in development
 */

/**
 * Check if tracking is enabled based on environment
 * @returns true if tracking should be enabled, false otherwise
 */
export function isTrackingEnabled(): boolean {
  // Check if explicitly disabled via environment variable
  const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED;
  if (analyticsEnabled === 'false' || analyticsEnabled === false) {
    return false;
  }

  // Check if we're in development mode (Vite's DEV flag)
  if (import.meta.env.DEV) {
    return false; // Disable tracking in development by default
  }

  // Check if running on localhost
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return false;
    }
  }

  // If explicitly enabled or in production, enable tracking
  return true;
}

