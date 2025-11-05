/**
 * Transaction Service
 * Handles fetching and managing prepaid transactions from Supabase
 * Uses direct REST API calls to bypass hanging client issues
 */

import { getAccessToken } from '../../lib/authToken';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

export interface PrepaidTransaction {
  id: string;
  user_id: string;
  customer_id: string;
  transaction_type: 'purchase' | 'refund' | 'expiration' | 'usage' | 'subscription_renewal';
  minutes_amount: number;
  payment_id: string | null;
  product_id: string | null;
  metadata: {
    amount?: number;
    currency?: string;
    invoice_id?: string;
    subscription_id?: string;
    plan_name?: string;
    billing_period_start?: string;
    billing_period_end?: string;
    status?: string;
    [key: string]: any;
  } | null;
  created_at: string;
}

export interface TransactionFilters {
  transaction_type?: PrepaidTransaction['transaction_type'];
  limit?: number;
  offset?: number;
}

/**
 * Fetch prepaid transactions using REST API (bypasses hanging client)
 * Database-first approach: queries by customer_id like reference implementation
 */
export async function fetchPrepaidTransactions(
  userId: string,
  filters?: TransactionFilters
): Promise<PrepaidTransaction[]> {
  try {
    console.log('[TransactionService] Fetching transactions via REST API for user:', userId);
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Step 1: Get customer_id from user profile (like reference gets dodoCustomerId)
    const profileUrl = `${supabaseUrl}/rest/v1/profiles?select=customer_id&id=eq.${userId}`;
    const profileController = new AbortController();
    const profileTimeoutId = setTimeout(() => profileController.abort(), 5000);
    
    const profileResponse = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: profileController.signal,
    });
    
    clearTimeout(profileTimeoutId);
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('[TransactionService] Failed to fetch profile:', errorText);
      throw new Error(`Failed to fetch customer_id: ${errorText}`);
    }
    
    const profileData = await profileResponse.json();
    const customerId = profileData[0]?.customer_id;
    
    if (!customerId) {
      console.log('[TransactionService] No customer_id found for user');
      return [];
    }
    
    // Step 2: Query transactions by customer_id (like reference queries payments table)
    const url = `${supabaseUrl}/rest/v1/prepaid_transactions`;
    const params = new URLSearchParams();
    params.append('select', '*');
    params.append('customer_id', `eq.${customerId}`); // Query by customer_id like reference
    params.append('order', 'created_at.desc'); // Most recent first
    
    if (filters?.transaction_type) {
      params.append('transaction_type', `eq.${filters.transaction_type}`);
    }
    
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    if (filters?.offset) {
      params.append('offset', filters.offset.toString());
    }
    
    const fullUrl = `${url}?${params.toString()}`;
    console.log('[TransactionService] REST API URL:', fullUrl.substring(0, 200) + '...');
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
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
      console.error('[TransactionService] Error', response.status, ':', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    let transactions = (Array.isArray(data) ? data : []) as PrepaidTransaction[];
    
    // Payments are synced via webhooks, so database is the source of truth
    // Already sorted by created_at.desc in query
    
    // Step 3: If database is empty, sync historical payments from DodoPayments
    if (transactions.length === 0) {
      try {
        console.log('[TransactionService] Database empty, syncing historical payments from DodoPayments...');
        
        const syncResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: 'get-customer-payments',
            customer_id: customerId,
          }),
        });

        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log(`[TransactionService] Synced ${syncResult.data?.synced || 0} historical payments`);
          
          // Re-query database after sync
          const reQueryUrl = `${supabaseUrl}/rest/v1/prepaid_transactions`;
          const reQueryParams = new URLSearchParams();
          reQueryParams.append('select', '*');
          reQueryParams.append('customer_id', `eq.${customerId}`);
          reQueryParams.append('order', 'created_at.desc');
          
          if (filters?.transaction_type) {
            reQueryParams.append('transaction_type', `eq.${filters.transaction_type}`);
          }
          if (filters?.limit) {
            reQueryParams.append('limit', filters.limit.toString());
          }
          if (filters?.offset) {
            reQueryParams.append('offset', filters.offset.toString());
          }
          
          const reQueryFullUrl = `${reQueryUrl}?${reQueryParams.toString()}`;
          
          const reQueryController = new AbortController();
          const reQueryTimeoutId = setTimeout(() => reQueryController.abort(), 10000);
          
          const reQueryResponse = await fetch(reQueryFullUrl, {
            method: 'GET',
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            signal: reQueryController.signal,
          });
          
          clearTimeout(reQueryTimeoutId);
          
          if (reQueryResponse.ok) {
            const reQueryData = await reQueryResponse.json();
            transactions = (Array.isArray(reQueryData) ? reQueryData : []) as PrepaidTransaction[];
            console.log('[TransactionService] Successfully fetched', transactions.length, 'transactions after sync');
          } else {
            console.warn('[TransactionService] Failed to re-query after sync, using empty array');
          }
        } else {
          const errorText = await syncResponse.text();
          console.error('[TransactionService] Failed to sync historical payments:', errorText);
          // Don't fail completely - return empty array
        }
      } catch (syncError: any) {
        console.error('[TransactionService] Error syncing historical payments:', syncError.message);
        // Return empty array on error - don't throw
      }
    } else {
      console.log('[TransactionService] Successfully fetched', transactions.length, 'transactions from database');
    }
    
    return transactions;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[TransactionService] Request timeout after 10 seconds');
      throw new Error('Request timeout after 10 seconds');
    }
    console.error('[TransactionService] Exception fetching transactions:', error);
    throw error;
  }
}

/**
 * Get transaction count using REST API (bypasses hanging client)
 */
export async function getTransactionCount(
  userId: string,
  transactionType?: PrepaidTransaction['transaction_type']
): Promise<number> {
  try {
    console.log('[TransactionService] Counting transactions via REST API for user:', userId);
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Build query URL with count
    const url = `${supabaseUrl}/rest/v1/prepaid_transactions`;
    const params = new URLSearchParams();
    params.append('select', 'id');
    params.append('user_id', `eq.${userId}`);
    
    if (transactionType) {
      params.append('transaction_type', `eq.${transactionType}`);
    }
    
    const fullUrl = `${url}?${params.toString()}`;
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(fullUrl, {
      method: 'HEAD', // Use HEAD to get count without data
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    // Get count from Content-Range header
    const contentRange = response.headers.get('content-range');
    const count = contentRange ? parseInt(contentRange.split('/')[1] || '0', 10) : 0;
    
    console.log('[TransactionService] Transaction count:', count);
    return count;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout after 10 seconds');
    }
    console.error('[TransactionService] Exception counting transactions:', error);
    throw error;
  }
}

