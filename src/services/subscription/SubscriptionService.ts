/**
 * Subscription Service
 * Handles subscription-related data fetching from Supabase
 * Uses direct REST API calls to bypass problematic client abstraction
 */

import { supabase } from '../../lib/supabase';
import { getAccessToken } from '../../lib/authToken';
import { getDodoPaymentsService } from './DodoPaymentsService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Direct REST API fetch - bypasses Supabase client entirely
 * Uses native fetch() with explicit timeout handling
 */
async function fetchWithRestAPI(
  table: string,
  select: string,
  filters: Record<string, any>,
  accessToken: string,
  timeoutMs: number = 10000
): Promise<any[]> {
  const url = `${supabaseUrl}/rest/v1/${table}`;
  
  // Build query params for PostgREST
  const params = new URLSearchParams();
  params.append('select', select);
  
  // Add filters using PostgREST syntax (e.g., id=eq.uuid)
  Object.entries(filters).forEach(([key, value]) => {
    params.append(key, `eq.${value}`);
  });
  params.append('limit', '1');
  
  const fullUrl = `${url}?${params.toString()}`;
  console.log(`[REST API] Fetching ${table}:`, fullUrl.substring(0, 200) + '...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[REST API] Error ${response.status} for ${table}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[REST API] Success for ${table}:`, Array.isArray(data) ? `${data.length} row(s)` : 'single object');
    return Array.isArray(data) ? data : [data];
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`[REST API] Request timeout after ${timeoutMs}ms for ${table}`);
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    console.error(`[REST API] Error fetching ${table}:`, error);
    throw error;
  }
}

export interface SubscriptionInfo {
  user_id: string;
  profile: {
    tts_minutes_limit: number;
    tts_minutes_used: number;
    last_reset_date: string | null;
    prepaid_minutes?: number;
  };
  subscription: {
    id: string;
    status: string;
    plan_id: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    payment_gateway_subscription_id: string | null;
  } | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    tts_minutes_included: number;
    price_per_month: number | null;
    currency: string;
  } | null;
}

export interface UsageLimitInfo {
  has_limit: boolean;
  minutes_limit: number;
  prepaid_minutes?: number;
  minutes_used: number;
  minutes_remaining: number | null;
  limit_exceeded: boolean;
  needs_reset: boolean;
  last_reset_date: string | null;
  current_period_end: string | null;
}

/**
 * Fetch user subscription info using direct REST API calls
 * Bypasses Supabase client to avoid hanging issues
 */
export async function fetchSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
  try {
    console.log('[SubscriptionService] ========== STARTING REST API FETCH ==========');
    const startTime = Date.now();
    
    // Get access token - uses shared utility that bypasses hanging getSession()
    console.log('[SubscriptionService] Getting access token...');
    const accessToken = await getAccessToken();
    console.log('[SubscriptionService] Access token obtained, length:', accessToken?.length || 0);
    
    // Fetch profile using REST API
    console.log('[SubscriptionService] Fetching profile via REST API...');
    const profileDataArray = await fetchWithRestAPI(
      'profiles',
      'tts_minutes_limit,tts_minutes_used,last_reset_date,prepaid_minutes,subscription_id',
      { id: userId },
      accessToken
    );
    
    if (!profileDataArray || profileDataArray.length === 0) {
      throw new Error('Profile not found');
    }
    
    const profileData = profileDataArray[0];
    console.log('[SubscriptionService] Profile data received:', profileData);
    
    // Fetch subscription if exists
    let subscriptionData = null;
    let productData = null;
    
    if (profileData?.subscription_id) {
      console.log('[SubscriptionService] Fetching subscription via REST API...');
      const subDataArray = await fetchWithRestAPI(
        'subscriptions',
        'id,status,plan_id,current_period_start,current_period_end,cancel_at_period_end,payment_gateway_subscription_id',
        { 
          id: profileData.subscription_id,
          user_id: userId 
        },
        accessToken
      );
      
      if (subDataArray && subDataArray.length > 0) {
        subscriptionData = subDataArray[0];
        console.log('[SubscriptionService] Subscription data received:', subscriptionData);
        
        // Fetch product if subscription exists
        if (subscriptionData.plan_id) {
          console.log('[SubscriptionService] Fetching product via REST API...');
          const prodDataArray = await fetchWithRestAPI(
            'products',
            'id,name,description,tts_minutes_included,price_per_month,currency',
            { gateway_product_id: subscriptionData.plan_id },
            accessToken
          );
          
          if (prodDataArray && prodDataArray.length > 0) {
            productData = prodDataArray[0];
            console.log('[SubscriptionService] Product data received:', productData);
          }
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[SubscriptionService] REST API fetch completed in ${duration}ms`);
    
    // Build SubscriptionInfo structure
    const result: SubscriptionInfo = {
      user_id: userId,
      profile: {
        tts_minutes_limit: profileData?.tts_minutes_limit || 0,
        tts_minutes_used: profileData?.tts_minutes_used || 0,
        last_reset_date: profileData?.last_reset_date || null,
        prepaid_minutes: profileData?.prepaid_minutes || 0,
      },
      subscription: subscriptionData ? {
        id: subscriptionData.id,
        status: subscriptionData.status,
        plan_id: subscriptionData.plan_id,
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
        cancel_at_period_end: subscriptionData.cancel_at_period_end,
        payment_gateway_subscription_id: subscriptionData.payment_gateway_subscription_id,
      } : null,
      product: productData ? {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        tts_minutes_included: productData.tts_minutes_included,
        price_per_month: productData.price_per_month,
        currency: productData.currency,
      } : null,
    };
    
    return result;
  } catch (error: any) {
    console.error('[SubscriptionService] Exception fetching subscription info:', {
      error,
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  }
}

/**
 * Fetch usage limit info using direct REST API calls
 * Bypasses Supabase client to avoid hanging issues
 */
export async function fetchUsageLimit(userId: string): Promise<UsageLimitInfo | null> {
  try {
    console.log('[SubscriptionService] ========== STARTING REST API FETCH (Usage Limit) ==========');
    const startTime = Date.now();
    
    // Get access token - bypasses hanging getSession() when possible
    console.log('[SubscriptionService] Getting access token for usage limit...');
    const accessToken = await getAccessToken();
    
    // Fetch profile using REST API
    console.log('[SubscriptionService] Fetching profile for usage limit via REST API...');
    const profileDataArray = await fetchWithRestAPI(
      'profiles',
      'tts_minutes_limit,tts_minutes_used,last_reset_date,prepaid_minutes,subscription_id',
      { id: userId },
      accessToken
    );
    
    if (!profileDataArray || profileDataArray.length === 0) {
      throw new Error('Profile not found');
    }
    
    const profileData = profileDataArray[0];
    
    // Get subscription period end if subscription exists
    let currentPeriodEnd: string | null = null;
    if (profileData?.subscription_id) {
      console.log('[SubscriptionService] Fetching subscription period end via REST API...');
      const subDataArray = await fetchWithRestAPI(
        'subscriptions',
        'current_period_end',
        { id: profileData.subscription_id },
        accessToken
      );
      
      currentPeriodEnd = subDataArray?.[0]?.current_period_end || null;
    }
    
    const duration = Date.now() - startTime;
    console.log(`[SubscriptionService] Usage limit REST API fetch completed in ${duration}ms`);
    
    // Calculate values
    const minutesLimit = profileData?.tts_minutes_limit || 0;
    const secondsUsed = profileData?.tts_minutes_used || 0;
    const minutesUsed = Math.ceil(secondsUsed / 60);
    const prepaidMinutes = profileData?.prepaid_minutes || 0;
    const lastResetDate = profileData?.last_reset_date || null;
    
    // Calculate remaining minutes (subscription remaining + prepaid)
    let minutesRemaining: number | null = null;
    if (minutesLimit > 0) {
      const subscriptionRemaining = Math.max(0, minutesLimit - minutesUsed);
      minutesRemaining = subscriptionRemaining + prepaidMinutes;
    } else if (prepaidMinutes > 0) {
      minutesRemaining = prepaidMinutes;
    }
    
    // Check if limit exceeded
    const limitExceeded = minutesLimit > 0 && minutesUsed >= minutesLimit && prepaidMinutes === 0;
    
    // Check if reset needed
    let needsReset = false;
    if (currentPeriodEnd && lastResetDate) {
      const periodEndDate = new Date(currentPeriodEnd);
      const resetDate = new Date(lastResetDate);
      const now = new Date();
      if (resetDate < periodEndDate && now >= periodEndDate) {
        needsReset = true;
      }
    } else if (!lastResetDate) {
      needsReset = true;
    }
    
    const result: UsageLimitInfo = {
      has_limit: minutesLimit > 0,
      minutes_limit: minutesLimit,
      prepaid_minutes: prepaidMinutes,
      minutes_used: minutesUsed,
      minutes_remaining: minutesRemaining,
      limit_exceeded: limitExceeded,
      needs_reset: needsReset,
      last_reset_date: lastResetDate,
      current_period_end: currentPeriodEnd,
    };
    
    console.log('[SubscriptionService] Calculated usage limit:', result);
    return result;
  } catch (error: any) {
    console.error('[SubscriptionService] Exception fetching usage limit:', {
      error,
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  }
}

/**
 * Sync subscription status from DodoPayments API to Supabase
 * This ensures subscription status is up-to-date even if webhooks fail
 */
export async function syncSubscriptionFromDodoPayments(
  userId: string,
  paymentGatewaySubscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[SubscriptionService] Syncing subscription from DodoPayments:', {
      userId,
      subscriptionId: paymentGatewaySubscriptionId,
    });

    // Get customer_id from profile
    const accessToken = await getAccessToken();
    const profileUrl = `${supabaseUrl}/rest/v1/profiles?select=customer_id&id=eq.${userId}`;
    
    const profileResponse = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch customer_id from profile');
    }

    const profileData = await profileResponse.json();
    const customerId = profileData[0]?.customer_id;

    if (!customerId) {
      console.warn('[SubscriptionService] No customer_id found, cannot sync subscription');
      return { success: false, error: 'No customer_id found' };
    }

    // Fetch subscription from DodoPayments
    const dodoService = getDodoPaymentsService();
    if (!dodoService.isServiceEnabled()) {
      return { success: false, error: 'DodoPayments service not enabled' };
    }

    const subscription = await dodoService.getSubscription(paymentGatewaySubscriptionId);
    
    if (!subscription) {
      console.warn('[SubscriptionService] Subscription not found in DodoPayments');
      return { success: false, error: 'Subscription not found in DodoPayments' };
    }

    // Parse dates
    const parseDate = (dateValue: any): Date => {
      if (!dateValue) return new Date();
      if (typeof dateValue === 'number') {
        return new Date(dateValue > 1000000000000 ? dateValue : dateValue * 1000);
      }
      return new Date(dateValue);
    };

    const currentPeriodStart = parseDate(subscription.current_period_start || subscription.billing_period_start);
    const currentPeriodEnd = parseDate(subscription.current_period_end || subscription.billing_period_end);
    const status = subscription.status;

    // Map DodoPayments status to our status
    let mappedStatus = 'inactive';
    if (status === 'active') {
      mappedStatus = 'active';
    } else if (status === 'trialing' || status === 'trial') {
      mappedStatus = 'trial';
    } else if (status === 'canceled' || status === 'cancelled') {
      mappedStatus = 'cancelled';
    } else if (status === 'past_due') {
      mappedStatus = 'past_due';
    }

    // Update subscription in Supabase
    const updateUrl = `${supabaseUrl}/rest/v1/subscriptions`;
    const updateResponse = await fetch(`${updateUrl}?payment_gateway_subscription_id=eq.${paymentGatewaySubscriptionId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        status: mappedStatus,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update subscription: ${errorText}`);
    }

    console.log('[SubscriptionService] Successfully synced subscription from DodoPayments');
    return { success: true };
  } catch (error: any) {
    console.error('[SubscriptionService] Error syncing subscription:', {
      error: error?.message,
      stack: error?.stack,
      userId,
    });
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Get user profile data using direct REST API calls
 * Bypasses Supabase client to avoid hanging issues
 */
export async function fetchUserProfile(userId: string) {
  try {
    console.log('[SubscriptionService] Fetching user profile via REST API...');
    
    // Get access token - bypasses hanging getSession() when possible
    const accessToken = await getAccessToken();
    
    // Fetch profile using REST API
    const dataArray = await fetchWithRestAPI(
      'profiles',
      '*',
      { id: userId },
      accessToken
    );
    
    if (!dataArray || dataArray.length === 0) {
      throw new Error('Profile not found');
    }
    
    console.log('[SubscriptionService] User profile fetched successfully');
    return dataArray[0];
  } catch (error) {
    console.error('[SubscriptionService] Exception fetching profile:', error);
    throw error;
  }
}

/**
 * Cancel subscription - sets cancel_at_next_billing_date to true
 */
export async function cancelSubscription(
  userId: string,
  paymentGatewaySubscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[SubscriptionService] Cancelling subscription:', {
      userId,
      subscriptionId: paymentGatewaySubscriptionId,
    });

    const accessToken = await getAccessToken();
    const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1/subscriptions`;

    const response = await fetch(supabaseFunctionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'cancel-subscription',
        subscription_id: paymentGatewaySubscriptionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // Use errorText as-is if not JSON
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[SubscriptionService] Subscription cancelled successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[SubscriptionService] Error cancelling subscription:', {
      error: error?.message,
      stack: error?.stack,
    });
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Change subscription plan
 */
export async function changeSubscriptionPlan(
  userId: string,
  paymentGatewaySubscriptionId: string,
  newProductId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[SubscriptionService] Changing subscription plan:', {
      userId,
      subscriptionId: paymentGatewaySubscriptionId,
      newProductId,
    });

    const accessToken = await getAccessToken();
    const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1/subscriptions`;

    const response = await fetch(supabaseFunctionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'change-plan',
        subscription_id: paymentGatewaySubscriptionId,
        product_id: newProductId,
        quantity: 1,
        proration_billing_mode: 'prorated_immediately',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // Use errorText as-is if not JSON
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[SubscriptionService] Subscription plan changed successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[SubscriptionService] Error changing subscription plan:', {
      error: error?.message,
      stack: error?.stack,
    });
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

