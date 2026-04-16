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
    // console.log('[authToken] Reading access token from localStorage...');

    // Supabase stores auth data in localStorage with key pattern
    // Find the Supabase auth token key
    const rawKeys = Object.keys(localStorage);
    const authKeys = rawKeys.filter(key => key.startsWith('sb-') && key.endsWith('-auth-token'));

    // console.log('[authToken] Found auth keys:', authKeys);

    if (authKeys.length > 0) {
      // Prioritize the key that matches current project if possible
      const key = authKeys[0];
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const session = JSON.parse(item);
          if (session?.access_token) {
            //   console.log('[authToken] Found access token in', key);
            return session.access_token;
          }
        }
      } catch (e) {
        console.warn('[authToken] Error parsing session from key:', key, e);
      }
    }

    // Check for "currentSession" key which some auth flows might use
    try {
      const item = localStorage.getItem('currentSession');
      if (item) {
        const session = JSON.parse(item);
        if (session?.access_token) {
          // console.log('[authToken] Found access token in currentSession');
          return session.access_token;
        }
      }
    } catch { }

    // Last resort: Look for ANY key that might contain our token structure
    // This is useful if the key name format changed
    for (const key of rawKeys) {
      if (key.includes('auth-token')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const session = JSON.parse(item);
            if (session?.access_token) {
              // console.log('[authToken] Found access token in fallback key:', key);
              return session.access_token;
            }
          }
        } catch { }
      }
    }

    // console.warn('[authToken] No access token found in localStorage');
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
    // console.log('[authToken] Using token from localStorage');
    // Return simplified structure - caller may need to call getSession() for full user data
    return { session: { access_token: tokenFromStorage } };
  }

  // Fallback to getSession() with timeout
  // console.log('[authToken] Token not in localStorage, trying getSession()...');

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

    // console.log('[authToken] Got session from getSession()');
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
    try {
      // Use jwt-decode to get user data instantly without network call
      const { jwtDecode } = await import('jwt-decode');
      const decoded: any = jwtDecode(tokenFromStorage);

      if (decoded && decoded.sub) {
        // console.log('[authToken] Extracted user info from JWT decode');
        return {
          user: {
            id: decoded.sub,
            email: decoded.email || decoded.user_metadata?.email
          }
        };
      }
    } catch (e) {
      console.warn('[authToken] Failed to decode JWT from storage:', e);
    }
  }

  // Fallback to getUser() with timeout
  // console.log('[authToken] Calling getUser()...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

    // console.log('[authToken] Got user from getUser()');
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn('[authToken] getUser() was aborted due to timeout');
    } else {
      console.error('[authToken] Failed to get user:', error);
    }
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

