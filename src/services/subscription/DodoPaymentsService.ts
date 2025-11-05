/**
 * DodoPayments Service - Handles usage-based billing event ingestion
 * Sends TTS usage events to DodoPayments for automated billing
 * Database-first approach: queries database first, uses Edge Functions as fallback
 */

import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

interface UsageEvent {
  event_id: string;
  customer_id: string;
  event_name: string;
  metadata?: Record<string, any>;
}

interface DodoPaymentsConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DodoPaymentsService {
  private apiKey: string;
  private baseUrl: string;
  private isEnabled: boolean;

  constructor(config?: DodoPaymentsConfig) {
    // Get from environment or config (for server-side usage events)
    this.apiKey = config?.apiKey || import.meta.env.VITE_DODO_API_KEY || '';
    this.baseUrl = config?.baseUrl || import.meta.env.VITE_DODO_BASE_URL || 'https://test.dodopayments.com';
    
    // Only enable if API key is present (for server-side) or if we're in browser
    this.isEnabled = !!this.apiKey || typeof window !== 'undefined';
    
    if (!this.isEnabled) {
      console.warn('[DodoPayments] Service disabled');
    }
    
    console.log('[DodoPayments] Service initialized:', {
      isEnabled: this.isEnabled,
      baseUrl: this.baseUrl,
      isBrowser: typeof window !== 'undefined',
    });
  }

  /**
   * Send usage event to DodoPayments
   * Event format: { event_id, customer_id, event_name, metadata }
   */
  async sendUsageEvent(
    customerId: string,
    minutesUsed: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('[DodoPayments] Service disabled, skipping event send');
      return false;
    }

    if (!customerId) {
      console.warn('[DodoPayments] No customer ID provided, cannot send event');
      return false;
    }

    const event: UsageEvent = {
      event_id: `tts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      customer_id: customerId,
      event_name: 'tts.minute.used',
      metadata: {
        minutes: minutesUsed,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/events/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: [event],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DodoPayments API error: ${response.status} - ${errorText}`);
      }

      console.log('[DodoPayments] Usage event sent successfully:', {
        event_id: event.event_id,
        customer_id: customerId,
        minutes: minutesUsed,
      });

      return true;
    } catch (error) {
      console.error('[DodoPayments] Failed to send usage event:', error);
      // Don't throw - we don't want billing failures to break TTS functionality
      return false;
    }
  }

  /**
   * Send batch of usage events (for queue processing)
   */
  async sendBatchEvents(events: UsageEvent[]): Promise<boolean> {
    if (!this.isEnabled || events.length === 0) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/events/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
        }),
      });

      if (!response.ok) {
        throw new Error(`DodoPayments API error: ${response.status}`);
      }

      console.log(`[DodoPayments] Batch of ${events.length} events sent successfully`);
      return true;
    } catch (error) {
      console.error('[DodoPayments] Failed to send batch events:', error);
      return false;
    }
  }

  /**
   * Create or retrieve customer in DodoPayments
   * Returns customer_id if successful, null otherwise
   * Uses server-side proxy to avoid CORS issues
   */
  async createCustomer(
    email: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    if (!this.isEnabled) {
      console.log('[DodoPayments] Service disabled, cannot create customer');
      return null;
    }

    if (!email || !userId) {
      console.warn('[DodoPayments] Email and userId are required to create customer');
      return null;
    }

    try {
      // FIX: Derive name from email if not provided (required by DodoPayments API)
      const name = metadata?.name || email.split('@')[0] || `User ${userId.slice(-4)}`;
      
      // Use Edge Function to create customer
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create-user',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create customer: ${errorText}`);
      }

      const data = await response.json();
      const customerId = data.customer_id;
      
      if (!customerId) {
        throw new Error('No customer ID returned from Edge Function');
      }

      console.log('[DodoPayments] Customer created successfully:', { customerId, email });
      return customerId;
    } catch (error) {
      console.error('[DodoPayments] Failed to create customer:', error);
      // Don't throw - we don't want customer creation failures to break sign-up
      return null;
    }
  }

  /**
   * Get customer by email (database-first with Edge Function fallback)
   * 1. Check database for customer_id in profiles table
   * 2. If not found, call Edge Function to search DodoPayments API
   */
  async getCustomerByEmail(email: string): Promise<string | null> {
    if (!this.isEnabled || !email) {
      return null;
    }

    try {
      // Step 1: Check database first - get user_id from auth, then check profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('[DodoPayments] No authenticated user for customer lookup');
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('customer_id')
        .eq('id', session.user.id)
        .single();

      if (profile?.customer_id) {
        console.log('[DodoPayments] Found customer_id in database:', profile.customer_id);
        return profile.customer_id;
      }

      // Step 2: Not in database - call Edge Function to search DodoPayments
      console.log('[DodoPayments] Customer not in database, searching via Edge Function...');
      
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'get-customer-by-email',
          email: email,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DodoPayments] Edge Function error:', errorText);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.customer_id) {
        console.log('[DodoPayments] Found customer via Edge Function:', data.customer_id);
        return data.customer_id;
      }

      return null;
    } catch (error) {
      console.error('[DodoPayments] Failed to get customer by email:', error);
      return null;
    }
  }

  /**
   * Get customer payments/transactions from database
   * Payments are synced via webhooks, so query database only
   */
  async getCustomerPayments(customerId: string, limit: number = 100): Promise<any[]> {
    if (!this.isEnabled || !customerId) {
      console.warn('[DodoPayments] Service disabled or missing customer ID');
      return [];
    }

    try {
      console.log('[DodoPayments] Fetching payments from database for customer:', customerId);

      // Query prepaid_transactions table - payments are synced via webhooks
      const { data: transactions, error } = await supabase
        .from('prepaid_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit || 100);

      if (error) {
        console.error('[DodoPayments] Error fetching payments from database:', error);
        return [];
      }

      // Convert transactions to payment format for compatibility
      const payments = (transactions || []).map((tx: any) => ({
        payment_id: tx.payment_id || tx.id,
        id: tx.payment_id || tx.id,
        customer_id: tx.customer_id,
        status: tx.transaction_type === 'purchase' ? 'succeeded' : tx.transaction_type,
        total_amount: tx.metadata?.amount || 0,
        amount: tx.metadata?.amount || 0,
        product_id: tx.product_id,
        created_at: tx.created_at,
        metadata: tx.metadata,
      }));

      console.log('[DodoPayments] Successfully fetched', payments.length, 'payments from database for customer:', customerId);
      
      return payments;
    } catch (error: any) {
      console.error('[DodoPayments] Failed to fetch customer payments:', {
        error: error.message,
        stack: error.stack,
        customerId,
      });
      return [];
    }
  }

  /**
   * Get customer by customer ID
   */
  async getCustomer(customerId: string): Promise<any | null> {
    if (!this.isEnabled || !customerId) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('[DodoPayments] Failed to get customer:', error);
      return null;
    }
  }

  /**
   * Get customer payments by email (convenience method)
   */
  async getCustomerPaymentsByEmail(email: string): Promise<any[]> {
    const customerId = await this.getCustomerByEmail(email);
    if (!customerId) {
      return [];
    }
    return this.getCustomerPayments(customerId);
  }

  /**
   * Get customer subscriptions from database
   * Subscriptions are synced via webhooks, so query database only
   */
  async getCustomerSubscriptions(customerId: string): Promise<any[]> {
    if (!this.isEnabled || !customerId) {
      console.warn('[DodoPayments] Service disabled or missing customer ID');
      return [];
    }

    try {
      console.log('[DodoPayments] Fetching subscriptions from database for customer:', customerId);

      // First, get user_id from customer_id via profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('customer_id', customerId)
        .single();

      if (!profile?.id) {
        console.warn('[DodoPayments] No profile found for customer_id:', customerId);
        return [];
      }

      // Query subscriptions table - subscriptions are synced via webhooks
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.id);

      if (error) {
        console.error('[DodoPayments] Error fetching subscriptions from database:', error);
        return [];
      }

      console.log('[DodoPayments] Successfully fetched', subscriptions?.length || 0, 'subscriptions from database for customer:', customerId);
      return subscriptions || [];
    } catch (error: any) {
      console.error('[DodoPayments] Failed to fetch customer subscriptions:', {
        error: error.message,
        stack: error.stack,
        customerId,
      });
      return [];
    }
  }

  /**
   * Get subscription details by subscription ID (database-first with Edge Function fallback)
   * 1. Check database first
   * 2. If not found, call Edge Function to fetch from DodoPayments API
   */
  async getSubscription(subscriptionId: string): Promise<any | null> {
    if (!this.isEnabled || !subscriptionId) {
      return null;
    }

    try {
      // Step 1: Check database first
      console.log('[DodoPayments] Checking database for subscription:', subscriptionId);
      
      const { data: subscription, error: dbError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('payment_gateway_subscription_id', subscriptionId)
        .single();

      if (subscription && !dbError) {
        console.log('[DodoPayments] Found subscription in database');
        return subscription;
      }

      // Step 2: Not in database - call Edge Function to fetch from DodoPayments
      console.log('[DodoPayments] Subscription not in database, fetching via Edge Function...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[DodoPayments] No authenticated user for subscription lookup');
        return null;
      }

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'get-subscription-by-id',
          subscription_id: subscriptionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DodoPayments] Edge Function error:', errorText);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.subscription) {
        console.log('[DodoPayments] Found subscription via Edge Function');
        return data.subscription;
      }

      return null;
    } catch (error: any) {
      console.error('[DodoPayments] Failed to get subscription:', {
        error: error.message,
        stack: error.stack,
        subscriptionId,
      });
      return null;
    }
  }

  /**
   * Check if service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
let dodoPaymentsInstance: DodoPaymentsService | null = null;

/**
 * Get or create DodoPayments service instance
 */
export function getDodoPaymentsService(): DodoPaymentsService {
  if (!dodoPaymentsInstance) {
    dodoPaymentsInstance = new DodoPaymentsService();
  }
  return dodoPaymentsInstance;
}

