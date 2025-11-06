/**
 * Safe Auth Token Utilities
 * Bypasses Supabase client hanging issues by using localStorage first,
 * then falling back to client methods with explicit timeouts
 */

/**
 * Get access token directly from localStorage - bypasses Supabase client
 * Supabase stores session data in localStorage with pattern: sb-{project-ref}-auth-token
 */
export function getAccessTokenFromStorage(): string | null {
  try {
    console.log('[authToken] Reading access token from localStorage...');
    
    // Supabase stores auth data in localStorage with key pattern
    // Find the Supabase auth token key
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase.auth.token') || 
      key.includes('-auth-token') ||
      key.startsWith('sb-')
    );
    
    console.log('[authToken] Found auth keys:', authKeys);
    
    for (const key of authKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Session data might be stored in different structures
          if (parsed?.access_token) {
            console.log('[authToken] Found access token in', key);
            return parsed.access_token;
          }
          // Sometimes it's stored as currentSession.access_token
          if (parsed?.currentSession?.access_token) {
            console.log('[authToken] Found access token in currentSession');
            return parsed.currentSession.access_token;
          }
        }
      } catch (e) {
        // Try next key
        continue;
      }
    }
    
    // Fallback: try to find any JSON with access_token
    for (const key of Object.keys(localStorage)) {
      try {
        const value = localStorage.getItem(key);
        if (value && value.includes('access_token')) {
          const parsed = JSON.parse(value);
          if (parsed?.access_token && typeof parsed.access_token === 'string' && parsed.access_token.length > 100) {
            console.log('[authToken] Found access token in fallback key:', key);
            return parsed.access_token;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    console.warn('[authToken] No access token found in localStorage');
    return null;
  } catch (error) {
    console.error('[authToken] Error reading token from storage:', error);
    return null;
  }
}

/**
 * Get session safely - tries localStorage first, then falls back to getSession()
 * This avoids hanging on getSession() if possible
 */
export async function getSessionSafely(timeoutMs: number = 5000): Promise<{ session: { access_token: string; user?: any } | null }> {
  // Try localStorage first (fast, no async call)
  const tokenFromStorage = getAccessTokenFromStorage();
  if (tokenFromStorage) {
    console.log('[authToken] Using token from localStorage');
    // Return simplified structure - caller may need to call getSession() for full user data
    return { session: { access_token: tokenFromStorage } };
  }
  
  // Fallback to getSession() with timeout
  console.log('[authToken] Token not in localStorage, trying getSession()...');
  
  try {
    const { supabase } = await import('./supabase');
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`getSession() timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    const result = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]);
    
    const { data, error } = result as any;
    if (error || !data?.session) {
      throw new Error(`No session: ${error?.message || 'Not authenticated'}`);
    }
    
    console.log('[authToken] Got session from getSession()');
    return data;
  } catch (error: any) {
    console.error('[authToken] Failed to get session:', error);
    throw new Error(`Failed to get session: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Get user safely - tries localStorage first, then falls back to getUser()
 * This avoids hanging on getUser() if possible
 */
export async function getUserSafely(timeoutMs: number = 5000): Promise<{ user: any | null }> {
  // Try localStorage first - we can extract user ID from token if needed
  const tokenFromStorage = getAccessTokenFromStorage();
  if (tokenFromStorage) {
    // For now, we'll still call getUser() but with the token in hand
    // In the future, we could decode JWT to get user ID directly
    console.log('[authToken] Token found, but still need to call getUser() for full user object');
  }
  
  // Fallback to getUser() with timeout
  console.log('[authToken] Calling getUser()...');
  const timeoutId = setTimeout(() => {}, timeoutMs);
  
  try {
    const { supabase } = await import('./supabase');
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`getUser() timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    const result = await Promise.race([
      userPromise,
      timeoutPromise
    ]);
    
    clearTimeout(timeoutId);
    
    const { data, error } = result as any;
    if (error) {
      throw new Error(`Failed to get user: ${error?.message || 'Unknown error'}`);
    }
    
    console.log('[authToken] Got user from getUser()');
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[authToken] Failed to get user:', error);
    throw new Error(`Failed to get user: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Get access token - tries localStorage first, then falls back to getSession()
 * This avoids hanging on getSession() if possible
 * Token refresh is handled by SubscriptionService when 401 errors occur
 */
export async function getAccessToken(timeoutMs: number = 5000): Promise<string> {
  // Try localStorage first (fast, no async call)
  const tokenFromStorage = getAccessTokenFromStorage();
  if (tokenFromStorage) {
    console.log('[authToken] Using token from localStorage');
    return tokenFromStorage;
  }
  
  // Fallback to getSession() with timeout if token not in localStorage
  console.log('[authToken] Token not in localStorage, trying getSession()...');
  
  try {
    const { supabase } = await import('./supabase');
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`getSession() timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    const result = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]);
    
    const { data, error } = result as any;
    if (error || !data?.session?.access_token) {
      throw new Error('No active session. Please sign in.');
    }
    
    console.log('[authToken] Got session from getSession()');
    return data.session.access_token;
  } catch (error: any) {
    console.error('[authToken] Failed to get access token:', error);
    throw new Error(`Failed to get access token: ${error?.message || 'Unknown error'}`);
  }
}

