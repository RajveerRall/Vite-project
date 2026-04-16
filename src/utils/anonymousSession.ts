const SESSION_STORAGE_KEY = 'yoread_anonymous_session';
const SESSION_CONVERTED_KEY = 'yoread_session_converted';

/**
 * Generate or retrieve anonymous session ID
 * Format: anon_timestamp_randomstring
 */
export function getAnonymousSessionId(): string {
  // Check if session was already converted
  const wasConverted = localStorage.getItem(SESSION_CONVERTED_KEY);
  if (wasConverted === 'true') {
    // Don't reuse converted sessions
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_CONVERTED_KEY);
  }
  
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  
  if (!sessionId) {
    // Generate new session ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    sessionId = `anon_${timestamp}_${random}`;
    
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    console.log('[AnonymousSession] New session created:', sessionId);
  }
  
  return sessionId;
}

/**
 * Mark session as converted to prevent reuse
 */
export function markSessionAsConverted(): void {
  localStorage.setItem(SESSION_CONVERTED_KEY, 'true');
  console.log('[AnonymousSession] Session marked as converted');
}

/**
 * Clear anonymous session (e.g., on explicit logout)
 */
export function clearAnonymousSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_CONVERTED_KEY);
  console.log('[AnonymousSession] Session cleared');
}

/**
 * Get current session status
 */
export function getSessionStatus(): {
  hasSession: boolean;
  sessionId: string | null;
  wasConverted: boolean;
} {
  const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  const wasConverted = localStorage.getItem(SESSION_CONVERTED_KEY) === 'true';
  
  return {
    hasSession: !!sessionId,
    sessionId,
    wasConverted
  };
}
