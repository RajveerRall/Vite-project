// Subscription Webhook Handler for DodoPayments
// Handles subscription lifecycle events from DodoPayments payment gateway

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Webhook] Missing Supabase credentials');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const router = express.Router();

/**
 * Verify webhook signature for DodoPayments
 * DodoPayments typically uses HMAC-SHA256 signature verification
 */
function verifyWebhookSignature(req, secret) {
  if (!secret) {
    console.warn('[Webhook] No webhook secret provided, skipping verification');
    return true; // Allow in development if no secret is set
  }

  try {
    // DodoPayments sends signature in X-Signature header (or similar)
    // Adjust header name based on DodoPayments documentation
    const signature = req.headers['x-signature'] || req.headers['x-dodo-signature'] || req.headers['signature'];
    
    if (!signature) {
      console.error('[Webhook] No signature header found');
      return false;
    }

    // Create HMAC hash of the request body
    const hmac = crypto.createHmac('sha256', secret);
    const payload = req.body.toString(); // req.body is already parsed as string due to express.raw()
    const expectedSignature = hmac.update(payload).digest('hex');

    // Compare signatures (use constant-time comparison to prevent timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('[Webhook] Invalid signature');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Parse date from DodoPayments webhook (handles both ISO strings and Unix timestamps)
 */
function parseDate(dateValue) {
  if (!dateValue) return new Date();
  
  // If it's a number (Unix timestamp), convert to milliseconds
  if (typeof dateValue === 'number') {
    // Check if it's in seconds or milliseconds
    return new Date(dateValue > 1000000000000 ? dateValue : dateValue * 1000);
  }
  
  // If it's a string, try to parse as ISO date
  return new Date(dateValue);
}

/**
 * Handle subscription created event (DodoPayments format)
 * Improved error handling and data extraction
 */
async function handleSubscriptionCreated(eventData) {
  try {
    // DodoPayments event structure: event.data or event.object or event itself
    const subscription = eventData.data || eventData.object || eventData;
    const customerId = subscription.customer_id || subscription.customer?.id || subscription.customer;
    const subscriptionId = subscription.id || subscription.subscription_id;
    const status = subscription.status;
    
    console.log('[Webhook] Subscription created - raw data:', {
      subscriptionId,
      customerId,
      status,
      hasItems: !!subscription.items,
      hasProducts: !!subscription.product_id,
    });
    
    // Parse dates (DodoPayments may use ISO strings or Unix timestamps)
    const currentPeriodStart = parseDate(subscription.current_period_start || subscription.billing_period_start);
    const currentPeriodEnd = parseDate(subscription.current_period_end || subscription.billing_period_end);
    
    // Get price and product info (DodoPayments structure may vary)
    // Try multiple possible locations for product/price ID
    let priceId = subscription.price_id || subscription.price?.id;
    let productId = subscription.product_id || subscription.product?.id;
    
    // Check items array (subscriptions may have items array)
    if (!productId && subscription.items) {
      const items = Array.isArray(subscription.items) ? subscription.items : 
                   (subscription.items.data || [subscription.items]);
      if (items.length > 0) {
        priceId = priceId || items[0].price_id || items[0].price?.id;
        productId = productId || items[0].product_id || items[0].product?.id || items[0].price?.product;
      }
    }
    
    console.log('[Webhook] Subscription created - extracted:', {
      subscriptionId,
      customerId,
      status,
      priceId,
      productId,
      currentPeriodStart: currentPeriodStart.toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    });
    
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }
    
    if (!customerId) {
      console.error('[Webhook] Missing customer_id in subscription data');
      return { success: false, error: 'Missing customer_id' };
    }
    
    // Find user by customer_id (stored in profiles table)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, customer_id')
      .eq('customer_id', customerId)
      .single();
    
    if (profileError || !profile) {
      console.error('[Webhook] User not found for customer:', {
        customerId,
        error: profileError?.message,
        code: profileError?.code,
      });
      
      // Try to find user by email as fallback (if customer has email)
      const customerEmail = subscription.customer?.email || subscription.email;
      if (customerEmail) {
        console.log('[Webhook] Attempting to find user by email:', customerEmail);
        try {
          const { data: { users }, error: adminError } = await supabase.auth.admin.listUsers();
          if (!adminError && users) {
            const user = users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
            if (user) {
              // Update profile with customer_id
              await supabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  customer_id: customerId,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });
              
              // Retry profile lookup
              const { data: retryProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('customer_id', customerId)
                .single();
              
              if (retryProfile) {
                profile = retryProfile;
                console.log('[Webhook] Successfully linked customer_id to user:', user.id);
              }
            }
          }
        } catch (emailLookupError) {
          console.error('[Webhook] Failed to lookup user by email:', emailLookupError);
        }
      }
      
      if (!profile) {
        return { success: false, error: 'User not found for customer_id' };
      }
    }
    
    // Get product from database to find minutes included
    if (!productId) {
      console.warn('[Webhook] No product_id found in subscription, cannot determine minutes');
      return { success: false, error: 'Missing product_id' };
    }
    
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('tts_minutes_included, id')
      .eq('gateway_product_id', productId)
      .single();
    
    if (productError || !product) {
      console.error('[Webhook] Product not found:', {
        productId,
        error: productError?.message,
      });
      return { success: false, error: `Product not found: ${productId}` };
    }
    
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
    
    // Create or update subscription record
    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        payment_gateway_subscription_id: subscriptionId,
        user_id: profile.id,
        status: mappedStatus,
        plan_id: productId,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'payment_gateway_subscription_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (subError) {
      console.error('[Webhook] Error creating/updating subscription:', {
        error: subError.message,
        code: subError.code,
        subscriptionId,
      });
      return { success: false, error: subError.message };
    }
    
    // Update user profile with subscription and limit
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_id: subscriptionRecord.id,
        tts_minutes_limit: product.tts_minutes_included,
        tts_minutes_used: 0, // Reset on new subscription
        last_reset_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);
    
    if (updateError) {
      console.error('[Webhook] Error updating profile:', {
        error: updateError.message,
        code: updateError.code,
        userId: profile.id,
      });
      return { success: false, error: updateError.message };
    }
    
    console.log('[Webhook] ✅ Successfully processed subscription creation:', {
      subscriptionId: subscriptionRecord.id,
      userId: profile.id,
      status: mappedStatus,
    });
    return { success: true, subscriptionId: subscriptionRecord.id };
  } catch (error) {
    console.error('[Webhook] Exception handling subscription created:', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Handle subscription updated event (DodoPayments format)
 * Improved error handling and data extraction
 */
async function handleSubscriptionUpdated(eventData) {
  try {
    const subscription = eventData.data || eventData.object || eventData;
    const subscriptionId = subscription.id || subscription.subscription_id;
    const status = subscription.status;
    const customerId = subscription.customer_id || subscription.customer?.id || subscription.customer;
    
    console.log('[Webhook] Subscription updated:', {
      subscriptionId,
      customerId,
      status,
    });
    
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }
    
    if (!subscriptionId) {
      console.error('[Webhook] Missing subscription_id in update event');
      return { success: false, error: 'Missing subscription_id' };
    }
    
    const currentPeriodStart = parseDate(subscription.current_period_start || subscription.billing_period_start);
    const currentPeriodEnd = parseDate(subscription.current_period_end || subscription.billing_period_end);
    
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
    } else if (status === 'on_hold' || status === 'onhold') {
      mappedStatus = 'past_due'; // Treat on_hold as past_due
    }
    
    // Update subscription record
    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .update({
        status: mappedStatus,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      })
      .eq('payment_gateway_subscription_id', subscriptionId)
      .select('user_id, id')
      .single();
    
    if (subError) {
      console.error('[Webhook] Error updating subscription:', {
        error: subError.message,
        code: subError.code,
        subscriptionId,
      });
      return { success: false, error: subError.message };
    }
    
    if (!subscriptionRecord) {
      console.warn('[Webhook] Subscription not found in database:', subscriptionId);
      return { success: false, error: 'Subscription not found' };
    }
    
    // Get product to refresh tts_minutes_limit (similar to handleSubscriptionCreated)
    let productId = subscription.product_id || subscription.product?.id;
    
    // If product_id not in event, get it from subscription record
    if (!productId) {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('payment_gateway_subscription_id', subscriptionId)
        .single();
      
      if (existingSub) {
        productId = existingSub.plan_id;
      }
    }
    
    let ttsMinutesIncluded = 0;
    
    if (productId) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('tts_minutes_included')
        .eq('gateway_product_id', productId)
        .single();
      
      if (productError || !product) {
        console.warn('[Webhook] Product not found for subscription update:', {
          productId,
          error: productError?.message,
        });
      } else {
        ttsMinutesIncluded = product.tts_minutes_included || 0;
        console.log(`[Webhook] Found product minutes limit: ${ttsMinutesIncluded}`);
      }
    }
    
    // Update profile with subscription_id and tts_minutes_limit (if we have it)
    const profileUpdateData = {
      subscription_id: subscriptionRecord.id,
      updated_at: new Date().toISOString()
    };
    
    // Only update tts_minutes_limit if we successfully fetched it and subscription is active
    if (ttsMinutesIncluded > 0 && (mappedStatus === 'active' || mappedStatus === 'trial')) {
      profileUpdateData.tts_minutes_limit = ttsMinutesIncluded;
    } else if (mappedStatus === 'cancelled' || mappedStatus === 'inactive') {
      // Reset limit to 0 if subscription is cancelled/inactive
      profileUpdateData.tts_minutes_limit = 0;
    }
    
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', subscriptionRecord.user_id);
    
    if (profileUpdateError) {
      console.error('[Webhook] Error updating profile:', {
        error: profileUpdateError.message,
        userId: subscriptionRecord.user_id,
      });
    } else {
      console.log(`[Webhook] Updated profile ${subscriptionRecord.user_id} with limit: ${ttsMinutesIncluded}`);
    }
    
    // If subscription period changed, reset usage if needed
    if (subscriptionRecord.user_id && status === 'active') {
      try {
        const { error: resetError } = await supabase.rpc('reset_user_tts_usage', {
          p_user_id: subscriptionRecord.user_id,
          p_reset_reason: 'subscription_renewed'
        });
        
        if (resetError) {
          console.warn('[Webhook] Error resetting usage (non-critical):', resetError.message);
        }
      } catch (resetException) {
        console.warn('[Webhook] Exception resetting usage (non-critical):', resetException.message);
      }
    }
    
    console.log('[Webhook] ✅ Successfully updated subscription:', {
      subscriptionId: subscriptionRecord.id,
      status: mappedStatus,
      ttsMinutesLimit: ttsMinutesIncluded,
    });
    
    return { success: true };
  } catch (error) {
    console.error('[Webhook] Exception handling subscription updated:', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Handle subscription deleted event (DodoPayments format)
 */
async function handleSubscriptionDeleted(eventData) {
  try {
    const subscription = eventData.data || eventData.object || eventData;
    const subscriptionId = subscription.id || subscription.subscription_id;
    
    console.log('[Webhook] Subscription deleted:', { subscriptionId });
    
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }
    
    // Get subscription record to find user
    const { data: subscriptionRecord, error: fetchError } = await supabase
      .from('subscriptions')
      .select('user_id, id')
      .eq('payment_gateway_subscription_id', subscriptionId)
      .single();
    
    if (fetchError || !subscriptionRecord) {
      console.error('[Webhook] Subscription not found:', fetchError);
      return { success: false, error: 'Subscription not found' };
    }
    
    // Update subscription status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('payment_gateway_subscription_id', subscriptionId);
    
    if (updateError) {
      console.error('[Webhook] Error updating subscription:', updateError);
    }
    
    // Update user profile to remove subscription
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_id: null,
        tts_minutes_limit: 0, // Reset to free tier
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionRecord.user_id);
    
    if (profileError) {
      console.error('[Webhook] Error updating profile:', profileError);
      return { success: false, error: profileError.message };
    }
    
    console.log('[Webhook] Successfully processed subscription deletion');
    return { success: true };
  } catch (error) {
    console.error('[Webhook] Error handling subscription deleted:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle pack purchase event (one-time payment for minute packs)
 */
async function handlePackPurchase(eventData) {
  try {
    const payment = eventData.data || eventData.data?.object || eventData.object || eventData;
    
    // Log full payload for debugging
    console.log('[Webhook] Full payment event payload:', JSON.stringify(eventData, null, 2));
    
    // Extract customer information - DodoPayments creates customer automatically
    const customerId = payment.customer_id || payment.customer?.id || payment.customer;
    const customerEmail = payment.customer?.email || payment.email || payment.customer_email;
    
    // Extract metadata (from URL parameters if available)
    const userIdFromMetadata = payment.metadata?.user_id || payment.metadata?.userId;
    const planIdFromMetadata = payment.metadata?.plan_id;
    
    console.log('[Webhook] Pack purchase - extracted data:', { 
      customerId, 
      customerEmail,
      userIdFromMetadata,
      planIdFromMetadata,
      metadata: payment.metadata,
      paymentId: payment.id
    });
    
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }
    
    // Identify pack purchase
    const isPackPurchase = payment.metadata?.type === 'one-time' 
      || !payment.subscription_id
      || payment.metadata?.product_type === 'pack'
      || planIdFromMetadata?.includes('pack'); // Check if plan_id indicates pack
    
    if (!isPackPurchase) {
      console.log('[Webhook] Not a pack purchase, skipping');
      return { success: false, error: 'Not a pack purchase' };
    }
    
    // Product ID to minutes mapping (from DodoPayments checkout links)
    const PRODUCT_MINUTES_MAP = {
      'pdt_5M8Lxkn2sPl8QFLdvcQWM': 480, // 8 hours one-time pack ($0.99)
      'pdt_c782nCjrKrVYEVe26983x': 3000, // 50 hours monthly subscription ($5.00) - for reference
    };
    
    const productId = payment.product_id || payment.metadata?.product_id || payment.product?.id;
    const minutesToAdd = payment.metadata?.minutes 
      || payment.product_metadata?.minutes
      || PRODUCT_MINUTES_MAP[productId] // Map product ID to minutes
      || null;
    
    if (!minutesToAdd || minutesToAdd <= 0) {
      console.error('[Webhook] Invalid minutes value:', {
        minutesToAdd,
        productId,
        metadata: payment.metadata
      });
      return { success: false, error: `Invalid minutes value. Product ID: ${productId}` };
    }
    
    console.log('[Webhook] Adding minutes:', { customerId, productId, minutesToAdd });
    
    // Find user profile - try multiple methods in order of preference
    let profile = null;
    let fetchError = null;
    
    // Method 1: Find by email (PRIMARY - DodoPayments always provides this)
    if (!profile && customerEmail) {
      try {
        console.log('[Webhook] Looking up user by email:', customerEmail);
        
        // Use Supabase Admin API to find user by email
        const { data: { users }, error: adminError } = await supabase.auth.admin.listUsers();
        
        if (!adminError && users) {
          // Find user by email (case-insensitive)
          const user = users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
          
          if (user) {
            // Fetch the profile using the user ID
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('prepaid_minutes, id, customer_id')
              .eq('id', user.id)
              .single();
            
            if (!profileError && profileData) {
              profile = profileData;
              console.log('[Webhook] ✅ Found user by email:', customerEmail, 'User ID:', user.id);
              
              // Update profile with customer_id if DodoPayments created one
              if (customerId && !profile.customer_id) {
                await supabase
                  .from('profiles')
                  .update({ 
                    customer_id: customerId,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', user.id);
                console.log('[Webhook] Updated profile with customer_id:', customerId);
              }
            } else if (profileError?.code === 'PGRST116') {
              // Profile doesn't exist - create it
              console.log('[Webhook] Profile not found, creating new profile for user:', user.id);
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  customer_id: customerId || null,
                  prepaid_minutes: 0,
                  tts_minutes_limit: 0,
                  tts_minutes_used: 0,
                })
                .select('prepaid_minutes, id, customer_id')
                .single();
              
              if (!createError && newProfile) {
                profile = newProfile;
                console.log('[Webhook] ✅ Created new profile for user:', user.id);
              }
            }
          } else {
            console.warn('[Webhook] User not found with email:', customerEmail);
          }
        } else if (adminError) {
          console.error('[Webhook] Admin API error:', adminError);
        }
      } catch (emailLookupError) {
        console.error('[Webhook] Error looking up user by email:', emailLookupError);
      }
    }
    
    // Method 2: Find by customer_id (if we have it)
    if (!profile && customerId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('prepaid_minutes, id, customer_id')
        .eq('customer_id', customerId)
        .single();
      
      if (!error && data) {
        profile = data;
        console.log('[Webhook] ✅ Found user by customer_id:', customerId);
      }
    }
    
    // Method 3: Find by user_id from metadata (from checkout URL - fallback)
    if (!profile && userIdFromMetadata) {
      const { data, error } = await supabase
        .from('profiles')
        .select('prepaid_minutes, id, customer_id')
        .eq('id', userIdFromMetadata)
        .single();
      
      if (!error && data) {
        profile = data;
        console.log('[Webhook] ✅ Found user by user_id from metadata:', userIdFromMetadata);
        
        // Update profile with customer_id if DodoPayments created one
        if (customerId && !profile.customer_id) {
          await supabase
            .from('profiles')
            .update({ 
              customer_id: customerId,
              updated_at: new Date().toISOString()
            })
            .eq('id', userIdFromMetadata);
          console.log('[Webhook] Updated profile with customer_id:', customerId);
        }
      } else {
        fetchError = error;
      }
    }
    
    if (!profile) {
      console.error('[Webhook] ❌ Profile not found:', {
        customerId,
        userIdFromMetadata,
        customerEmail,
        error: fetchError?.message,
        paymentId: payment.id
      });
      return { 
        success: false, 
        error: 'Profile not found. Customer ID: ' + customerId + ', User ID from metadata: ' + userIdFromMetadata 
      };
    }
    
    // Increment prepaid_minutes (now stores seconds, convert minutes to seconds)
    const secondsToAdd = minutesToAdd * 60;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        prepaid_minutes: (profile.prepaid_minutes || 0) + secondsToAdd,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);
    
    if (updateError) {
      console.error('[Webhook] Error updating prepaid minutes:', updateError);
      return { success: false, error: updateError.message };
    }
    
    console.log('[Webhook] ✅ Successfully added minutes:', {
      userId: profile.id,
      minutesAdded: minutesToAdd,
      secondsAdded: secondsToAdd,
      newBalance: (profile.prepaid_minutes || 0) + secondsToAdd
    });
    
    // Log transaction for audit trail
    try {
      // Use placeholder customer_id if null (RPC requires NOT NULL)
      const transactionCustomerId = customerId || profile.customer_id || `pending_${payment.id || 'unknown'}`;
      
      const { error: logError } = await supabase.rpc('log_prepaid_transaction', {
        p_user_id: profile.id,
        p_customer_id: transactionCustomerId,
        p_transaction_type: 'purchase',
        p_minutes_amount: minutesToAdd,
        p_payment_id: payment.id || payment.payment_id || null,
        p_product_id: productId,
        p_metadata: payment.metadata || {}
      });
      
      if (logError) {
        console.warn('[Webhook] Failed to log transaction (non-critical):', logError);
      } else {
        console.log('[Webhook] ✅ Transaction logged successfully');
      }
    } catch (logErr) {
      console.warn('[Webhook] Error logging transaction (non-critical):', logErr);
    }
    
    return { success: true, minutesAdded: minutesToAdd };
  } catch (error) {
    console.error('[Webhook] ❌ Error handling pack purchase:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle pack refund event (refund for one-time pack purchases)
 */
async function handlePackRefund(eventData) {
  try {
    const refund = eventData.data || eventData.object || eventData;
    const customerId = refund.customer_id || refund.customer;
    const paymentId = refund.payment_id || refund.id;
    
    console.log('[Webhook] Pack refund:', { customerId, paymentId });
    
    if (!supabase || !customerId) {
      return { success: false, error: 'Missing customer ID' };
    }
    
    // Find the original purchase transaction
    const { data: originalTransaction, error: transactionError } = await supabase
      .from('prepaid_transactions')
      .select('minutes_amount, user_id, product_id')
      .eq('payment_id', paymentId)
      .eq('transaction_type', 'purchase')
      .single();
    
    if (transactionError || !originalTransaction) {
      console.error('[Webhook] Original purchase transaction not found:', transactionError);
      // Try to get minutes from refund metadata as fallback
      const minutesToRefund = refund.metadata?.minutes 
        || refund.amount_refunded 
        || null;
      
      if (!minutesToRefund) {
        return { success: false, error: 'Cannot determine refund amount' };
      }
      
      // Get profile to decrement
      const { data: profile } = await supabase
        .from('profiles')
        .select('prepaid_minutes, id')
        .eq('customer_id', customerId)
        .single();
      
      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }
      
      const refundAmount = -Math.abs(minutesToRefund);
      const newBalance = Math.max(0, (profile.prepaid_minutes || 0) + refundAmount);
      
      // Update prepaid balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          prepaid_minutes: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);
      
      if (updateError) {
        return { success: false, error: updateError.message };
      }
      
      // Log refund transaction
      await supabase.rpc('log_prepaid_transaction', {
        p_user_id: profile.id,
        p_customer_id: customerId,
        p_transaction_type: 'refund',
        p_minutes_amount: refundAmount,
        p_payment_id: paymentId,
        p_product_id: refund.product_id || null,
        p_metadata: refund.metadata || {}
      }).catch(err => console.warn('[Webhook] Failed to log refund:', err));
      
      return { success: true, minutesRefunded: Math.abs(refundAmount) };
    }
    
    // Refund the full amount from original purchase
    const refundAmount = -Math.abs(originalTransaction.minutes_amount);
    const { data: profile } = await supabase
      .from('profiles')
      .select('prepaid_minutes, id')
      .eq('customer_id', customerId)
      .single();
    
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }
    
    // Convert refund amount from minutes to seconds (prepaid_minutes now stores seconds)
    const secondsToRefund = refundAmount * 60;
    const newBalance = Math.max(0, (profile.prepaid_minutes || 0) + secondsToRefund);
    
    // Update prepaid balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        prepaid_minutes: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);
    
    if (updateError) {
      console.error('[Webhook] Error updating prepaid minutes for refund:', updateError);
      return { success: false, error: updateError.message };
    }
    
    // Log refund transaction
    try {
      await supabase.rpc('log_prepaid_transaction', {
        p_user_id: profile.id,
        p_customer_id: customerId,
        p_transaction_type: 'refund',
        p_minutes_amount: refundAmount,
        p_payment_id: paymentId,
        p_product_id: originalTransaction.product_id,
        p_metadata: { original_transaction_id: originalTransaction.id, ...(refund.metadata || {}) }
      }).catch(err => console.warn('[Webhook] Failed to log refund:', err));
    } catch (logErr) {
      console.warn('[Webhook] Error logging refund (non-critical):', logErr);
    }
    
    console.log('[Webhook] Successfully processed refund:', { customerId, minutesRefunded: Math.abs(refundAmount) });
    return { success: true, minutesRefunded: Math.abs(refundAmount) };
  } catch (error) {
    console.error('[Webhook] Error handling pack refund:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle invoice paid event (DodoPayments format - subscription renewal)
 */
async function handleInvoicePaid(eventData) {
  try {
    const invoice = eventData.data || eventData.object || eventData;
    const subscriptionId = invoice.subscription_id || invoice.subscription;
    
    console.log('[Webhook] Invoice paid:', { subscriptionId });
    
    if (!supabase || !subscriptionId) {
      return { success: false, error: 'Missing data' };
    }
    
    // Get subscription record
    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .eq('payment_gateway_subscription_id', subscriptionId)
      .single();
    
    if (subError || !subscriptionRecord) {
      console.error('[Webhook] Subscription not found:', subError);
      return { success: false, error: 'Subscription not found' };
    }
    
    // Get product to refresh minutes limit
    if (subscriptionRecord.plan_id) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('tts_minutes_included')
        .eq('gateway_product_id', subscriptionRecord.plan_id)
        .single();
      
      if (!productError && product) {
        // Reset usage on successful payment
        const { error: resetError } = await supabase.rpc('reset_user_tts_usage', {
          p_user_id: subscriptionRecord.user_id,
          p_reset_reason: 'invoice_paid'
        });
        
        if (resetError) {
          console.error('[Webhook] Error resetting usage:', resetError);
        }
        
        // Update limit if needed
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            tts_minutes_limit: product.tts_minutes_included,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionRecord.user_id);
        
        if (updateError) {
          console.error('[Webhook] Error updating profile:', updateError);
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Webhook] Error handling invoice paid:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle invoice payment failed event (DodoPayments format)
 */
async function handleInvoicePaymentFailed(eventData) {
  try {
    const invoice = eventData.data || eventData.object || eventData;
    const subscriptionId = invoice.subscription_id || invoice.subscription;
    
    console.log('[Webhook] Invoice payment failed:', { subscriptionId });
    
    if (!supabase || !subscriptionId) {
      return { success: false, error: 'Missing data' };
    }
    
    // Update subscription status to past_due
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('payment_gateway_subscription_id', subscriptionId);
    
    if (updateError) {
      console.error('[Webhook] Error updating subscription:', updateError);
      return { success: false, error: updateError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Webhook] Error handling invoice payment failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main webhook endpoint
 */
router.post('/api/subscription-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET || process.env.DODO_WEBHOOK_SECRET;
    
    // Verify webhook signature for DodoPayments
    if (webhookSecret && !verifyWebhookSignature(req, webhookSecret)) {
      console.error('[Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Parse event body (already a string due to express.raw())
    let event;
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error('[Webhook] Failed to parse event body:', parseError);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    
    // DodoPayments event type format: 'event.type' or 'type' field
    const eventType = event.type || event.event_type || event.event;
    
    console.log('[Webhook] Received DodoPayments event:', eventType);
    console.log('[Webhook] Event data:', JSON.stringify(event, null, 2));
    
    let result;
    
    // Route to appropriate handler based on event type (DodoPayments format)
    switch (eventType) {
      // Payment events
      case 'payment.succeeded':
        // Check if it's a pack purchase or subscription renewal
        const payment = event.data || event.object || event;
        if (payment.metadata?.type === 'one-time' 
          || !payment.subscription_id
          || payment.metadata?.product_type === 'pack') {
          result = await handlePackPurchase(event);
        } else {
          // Subscription renewal payment
          result = await handleInvoicePaid(event);
        }
        break;
        
      case 'payment.failed':
        result = await handleInvoicePaymentFailed(event);
        break;
        
      case 'payment.cancelled':
        // Payment was cancelled by user or gateway
        console.log('[Webhook] Payment cancelled:', event.data || event.object || event);
        result = { success: true, message: 'Payment cancellation logged' };
        break;
        
      case 'payment.processing':
        // Payment is still processing, just acknowledge
        console.log('[Webhook] Payment processing:', event.data || event.object || event);
        result = { success: true, message: 'Payment processing acknowledged' };
        break;
      
      // Subscription lifecycle events
      case 'subscription.active':
        // Subscription becomes active (first time or after reactivation)
        result = await handleSubscriptionCreated(event);
        break;
        
      case 'subscription.renewed':
        // Subscription renewed - reset usage and update period
        result = await handleInvoicePaid(event);
        break;
        
      case 'subscription.cancelled':
        result = await handleSubscriptionDeleted(event);
        break;
        
      case 'subscription.expired':
      case 'subscription.failed':
        // Treat expired/failed subscriptions as cancelled
        result = await handleSubscriptionDeleted(event);
        break;
        
      case 'subscription.on_hold':
        // Subscription is on hold - update status but keep subscription
        result = await handleSubscriptionUpdated(event);
        break;
        
      case 'subscription.plan_changed':
        // User changed subscription plan - update subscription record
        result = await handleSubscriptionUpdated(event);
        break;
      
      // Legacy event names (for backward compatibility)
      case 'subscription.created':
      case 'customer.subscription.created':
        result = await handleSubscriptionCreated(event);
        break;
        
      case 'subscription.updated':
      case 'customer.subscription.updated':
        result = await handleSubscriptionUpdated(event);
        break;
        
      case 'subscription.deleted':
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(event);
        break;
        
      case 'invoice.paid':
        // Fallback for invoice.paid if DodoPayments sends this
        result = await handleInvoicePaid(event);
        break;
        
      case 'invoice.payment_failed':
        result = await handleInvoicePaymentFailed(event);
        break;
        
      case 'refund.created':
      case 'refund.succeeded':
      case 'payment.refunded':
        result = await handlePackRefund(event);
        break;
        
      default:
        console.log('[Webhook] Unhandled event type:', eventType);
        return res.status(200).json({ received: true, message: 'Event type not handled' });
    }
    
    if (result && result.success) {
      res.status(200).json({ received: true, result });
    } else {
      console.error('[Webhook] Handler returned error:', result);
      res.status(500).json({ error: result?.error || 'Unknown error' });
    }
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
