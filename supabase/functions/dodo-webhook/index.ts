import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { DodoPayments } from 'https://esm.sh/dodopayments@2.4.1'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const rawBody = await req.text()
    console.log('[Webhook] Received webhook event')

    // Verify webhook signature
    const apiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const webhookKey = Deno.env.get('DODO_PAYMENTS_WEBHOOK_KEY') || Deno.env.get('DODO_WEBHOOK_SECRET')

    if (!apiKey || !webhookKey) {
      console.error('[Webhook] Missing DodoPayments credentials')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const webhookHeaders = {
      'webhook-id': req.headers.get('webhook-id') || '',
      'webhook-signature': req.headers.get('webhook-signature') || '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') || '',
    }

    try {
      const dodoPaymentsClient = new DodoPayments({
        bearerToken: apiKey,
        webhookKey: webhookKey,
      })
      
      const unwrappedWebhook = dodoPaymentsClient.webhooks.unwrap(rawBody, { headers: webhookHeaders })
      console.log('[Webhook] Signature verified:', unwrappedWebhook)
    } catch (error) {
      console.error('[Webhook] Signature verification failed:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse payload
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const eventType = payload.type
    const eventData = payload.data || payload.object || payload
    const webhookId = req.headers.get('webhook-id') || ''

    console.log(`[Webhook] Processing event: ${eventType}`)

    // Check idempotency (if webhook_id provided)
    if (webhookId) {
      // You could store this in a webhook_events table for idempotency
      // For now, we'll rely on database constraints
    }

    // Handle different event types
    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active':
      case 'subscription.renewed':
        await handleSubscriptionEvent(eventData, supabase)
        break

      case 'payment.succeeded':
        await handlePaymentEvent(eventData, supabase)
        break

      case 'subscription.cancelled':
      case 'subscription.deleted':
        await handleSubscriptionCancellation(eventData, supabase)
        break

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Webhook] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Ensure profile exists with user_id lookup and profile creation
 * Returns profile id if successful, null otherwise
 */
async function ensureProfileExists(
  supabase: any,
  userId: string,
  customerId: string,
  email: string,
  name?: string,
  additionalContext?: { ip?: string; user_agent?: string; checkout_source?: string }
): Promise<string | null> {
  try {
    // Check if profile exists by user_id
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, customer_id')
      .eq('id', userId)
      .single()

    if (existingProfile && !fetchError) {
      // Profile exists - update customer_id if missing or different
      if (!existingProfile.customer_id || existingProfile.customer_id !== customerId) {
        const updateData: any = {
          customer_id: customerId,
          updated_at: new Date().toISOString(),
        }

        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)

        console.log(`[Webhook] Updated profile ${userId} with customer_id ${customerId}`)
      }

      return existingProfile.id
    }

    // Profile doesn't exist - create it
    console.log(`[Webhook] Creating profile for user ${userId}`)

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        customer_id: customerId,
        // Note: email and name columns don't exist in profiles table schema
        tts_minutes_limit: 0,
        tts_minutes_used: 0,
        prepaid_minutes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (createError) {
      console.error(`[Webhook] Failed to create profile for user ${userId}:`, createError)
      return null
    }

    console.log(`[Webhook] Created profile ${newProfile.id} for user ${userId} with customer_id ${customerId}`)
    return newProfile.id
  } catch (error: any) {
    console.error(`[Webhook] Error in ensureProfileExists for user ${userId}:`, error)
    return null
  }
}

/**
 * Fallback: Find user by email if user_id not in metadata
 * Returns profile id if successful, null otherwise
 */
async function ensureProfileExistsByEmail(
  supabase: any,
  customerId: string,
  email: string,
  name?: string,
  additionalContext?: { ip?: string; user_agent?: string; checkout_source?: string }
): Promise<string | null> {
  try {
    // Search for user by email in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('[Webhook] Error listing users:', listError)
      return null
    }

    if (!users || users.length === 0) {
      console.warn(`[Webhook] No users found in auth system`)
      return null
    }

    // Find user by email (case-insensitive)
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      console.warn(`[Webhook] No Supabase user found for email ${email}, customer_id ${customerId}`)
      return null
    }

    // Use ensureProfileExists with found user_id
    return await ensureProfileExists(
      supabase,
      user.id,
      customerId,
      email,
      name,
      additionalContext
    )
  } catch (error: any) {
    console.error(`[Webhook] Error in ensureProfileExistsByEmail for email ${email}:`, error)
    return null
  }
}

async function handleSubscriptionEvent(eventData: any, supabase: any) {
  const customerId = eventData.customer?.customer_id || eventData.customer_id
  const subscriptionId = eventData.subscription_id || eventData.id
  const customerEmail = eventData.customer?.email || eventData.email
  const customerName = eventData.customer?.name || eventData.name

  if (!customerId) {
    console.error('[Webhook] No customer_id in subscription event')
    return
  }

  // Extract metadata from event (check multiple possible locations)
  const metadata = eventData.metadata || eventData.customer?.metadata || {}
  const supabaseUserId = metadata.supabase_user_id || metadata.user_id
  const customerIp = metadata.customer_ip
  const userAgent = metadata.user_agent
  const checkoutSource = metadata.source

  console.log('[Webhook] Subscription event metadata:', {
    supabaseUserId,
    customerId,
    customerEmail,
    hasMetadata: !!metadata,
  })

  // Ensure profile exists using metadata or fallback
  let profileId: string | null = null

  if (supabaseUserId) {
    // Direct user_id lookup from metadata
    profileId = await ensureProfileExists(
      supabase,
      supabaseUserId,
      customerId,
      customerEmail || '',
      customerName,
      {
        ip: customerIp,
        user_agent: userAgent,
        checkout_source: checkoutSource,
      }
    )
  }

  if (!profileId && customerEmail) {
    // Fallback to email lookup
    console.log('[Webhook] No user_id in metadata, falling back to email lookup')
    profileId = await ensureProfileExistsByEmail(
      supabase,
      customerId,
      customerEmail,
      customerName,
      {
        ip: customerIp,
        user_agent: userAgent,
        checkout_source: checkoutSource,
      }
    )
  }

  if (!profileId) {
    console.error('[Webhook] Profile not found for customer:', customerId)
    return
  }

  // Map status
  const statusMap: Record<string, string> = {
    active: 'active',
    trial: 'trial',
    cancelled: 'cancelled',
    expired: 'inactive',
    past_due: 'past_due',
    on_hold: 'inactive',
  }
  const mappedStatus = statusMap[eventData.status] || 'inactive'

  // Upsert subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: profileId,
      payment_gateway_subscription_id: subscriptionId,
      plan_id: eventData.product_id,
      status: mappedStatus,
      current_period_start: eventData.billing?.current_period_start 
        ? new Date(eventData.billing.current_period_start).toISOString()
        : null,
      current_period_end: eventData.next_billing_date || eventData.billing?.current_period_end
        ? new Date(eventData.next_billing_date || eventData.billing.current_period_end).toISOString()
        : null,
      cancel_at_period_end: eventData.cancel_at_next_billing_date || false,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'payment_gateway_subscription_id',
    })
    .select()
    .single()

  if (subError) {
    console.error('[Webhook] Failed to upsert subscription:', subError)
    return
  }

  // Get product to get tts_minutes_included
  let ttsMinutesIncluded = 0

  // First, try to get from Supabase products table
  const { data: product } = await supabase
    .from('products')
    .select('tts_minutes_included')
    .eq('gateway_product_id', eventData.product_id)
    .single()

  if (product) {
    ttsMinutesIncluded = product.tts_minutes_included || 0
    console.log(`[Webhook] Found product in Supabase: ${ttsMinutesIncluded} minutes`)
  } else {
    // Product not found - fetch from DodoPayments API
    console.log(`[Webhook] Product not found in Supabase, fetching from DodoPayments...`)
    
    try {
      const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
      const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'
      
      if (dodoApiKey && eventData.product_id) {
        const productResponse = await fetch(`${dodoBaseUrl}/products/${eventData.product_id}`, {
          headers: {
            'Authorization': `Bearer ${dodoApiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (productResponse.ok) {
          const dodoProduct = await productResponse.json()
          const productData = dodoProduct.data || dodoProduct
          
          // Extract tts_minutes_included from metadata
          const ttsMinutes = productData.metadata?.tts_minutes_included || 
                            productData.metadata?.tts_minutes || 
                            0
          
          ttsMinutesIncluded = parseInt(String(ttsMinutes), 10) || 0

          // Upsert to products table for future use
          const { error: upsertError } = await supabase
            .from('products')
            .upsert({
              gateway_product_id: eventData.product_id,
              name: productData.name || productData.title || 'Unknown Product',
              description: productData.description || null,
              tts_minutes_included: ttsMinutesIncluded,
              price_per_month: null,
              currency: productData.currency || 'usd',
              is_active: productData.active !== false,
              metadata: productData.metadata || {},
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'gateway_product_id',
            })

          if (upsertError) {
            console.error(`[Webhook] Failed to upsert product:`, upsertError)
          } else {
            console.log(`[Webhook] Synced product to products table: ${ttsMinutesIncluded} minutes`)
          }
        } else {
          console.warn(`[Webhook] Failed to fetch product from DodoPayments: ${productResponse.status}`)
        }
      }
    } catch (error) {
      console.error(`[Webhook] Error fetching product:`, error)
    }
  }

  // Update profiles.tts_minutes_limit with subscription minutes
  await supabase
    .from('profiles')
    .update({
      subscription_id: subscription.id,
      tts_minutes_limit: ttsMinutesIncluded,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)

  console.log(`[Webhook] Updated profile ${profileId}: subscription ${subscription.id}, ${ttsMinutesIncluded} minutes limit`)
}

async function handlePaymentEvent(eventData: any, supabase: any) {
  const customerId = eventData.customer?.customer_id || eventData.customer_id
  const customerEmail = eventData.customer?.email || eventData.email
  const customerName = eventData.customer?.name || eventData.name

  if (!customerId) {
    console.error('[Webhook] No customer_id in payment event')
    return
  }

  // Extract metadata from event (check multiple possible locations)
  const metadata = eventData.metadata || eventData.customer?.metadata || {}
  const supabaseUserId = metadata.supabase_user_id || metadata.user_id
  const customerIp = metadata.customer_ip
  const userAgent = metadata.user_agent
  const checkoutSource = metadata.source

  console.log('[Webhook] Payment event metadata:', {
    supabaseUserId,
    customerId,
    customerEmail,
    hasMetadata: !!metadata,
  })

  // Ensure profile exists using metadata or fallback
  let profileId: string | null = null

  if (supabaseUserId) {
    // Direct user_id lookup from metadata
    profileId = await ensureProfileExists(
      supabase,
      supabaseUserId,
      customerId,
      customerEmail || '',
      customerName,
      {
        ip: customerIp,
        user_agent: userAgent,
        checkout_source: checkoutSource,
      }
    )
  }

  if (!profileId && customerEmail) {
    // Fallback to email lookup
    console.log('[Webhook] No user_id in metadata, falling back to email lookup')
    profileId = await ensureProfileExistsByEmail(
      supabase,
      customerId,
      customerEmail,
      customerName,
      {
        ip: customerIp,
        user_agent: userAgent,
        checkout_source: checkoutSource,
      }
    )
  }

  if (!profileId) {
    console.error('[Webhook] Profile not found for customer:', customerId)
    return
  }

  const paymentId = eventData.payment_id || eventData.id

  if (!paymentId) {
    console.error('[Webhook] No payment_id in payment event')
    return
  }

  const isSubscriptionRenewal = !!eventData.subscription_id
  
  // Extract product_id from multiple possible locations
  // DodoPayments may send product_id in different places depending on event type
  const productId = eventData.product_id || 
                    eventData.metadata?.product_id || 
                    metadata.product_id ||
                    null
  
  // Product ID to minutes mapping (fallback if metadata doesn't have minutes)
  const PRODUCT_MINUTES_MAP: Record<string, number> = {
    'pdt_DPzwTqAAvyzaIjITvPdS7': 480, // 8 hours one-time pack ($0.99) - NEW ID
    'pdt_8iMQz734nklbq88QlyCBm': 3000, // 50 hours monthly subscription ($5.00) - NEW ID
  }
  
  // Detect prepaid purchases: check metadata first, then fallback to no subscription_id
  const isPrepaid = metadata.type === 'one-time' || 
                    metadata.product_type === 'pack' ||
                    (!isSubscriptionRenewal && !metadata.type) // Fallback: no subscription = one-time

  console.log('[Webhook] Payment analysis:', {
    isSubscriptionRenewal,
    isPrepaid,
    productId: productId, // Use extracted productId
    productIdFromEvent: eventData.product_id,
    productIdFromMetadata: eventData.metadata?.product_id || metadata.product_id,
    metadataType: metadata.type,
    productType: metadata.product_type,
    metadataMinutes: metadata.minutes,
  })

  // Get product info for plan name and minutes
  let planName = null
  let productMinutes = 0
  
  if (productId) { // Use extracted productId instead of eventData.product_id
    const { data: product } = await supabase
      .from('products')
      .select('name, tts_minutes_included')
      .eq('gateway_product_id', productId)
      .single()
    
    if (product) {
      planName = product.name || null
      productMinutes = product.tts_minutes_included || 0
    } else {
      // Product not found in Supabase - fetch from DodoPayments API
      try {
        const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
        const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'
        
        if (dodoApiKey) {
          const productResponse = await fetch(`${dodoBaseUrl}/products/${productId}`, {
            headers: {
              'Authorization': `Bearer ${dodoApiKey}`,
              'Content-Type': 'application/json',
            },
          })

          if (productResponse.ok) {
            const dodoProduct = await productResponse.json()
            const productData = dodoProduct.data || dodoProduct
            
            planName = productData.name || productData.title || null
            
            // Extract tts_minutes_included from metadata
            const ttsMinutes = productData.metadata?.tts_minutes_included || 
                              productData.metadata?.tts_minutes || 
                              0
            productMinutes = parseInt(String(ttsMinutes), 10) || 0

            // Upsert product to Supabase for future use
            await supabase
              .from('products')
              .upsert({
                gateway_product_id: productId, // Use extracted productId
                name: planName || 'Unknown Product',
                description: productData.description || null,
                tts_minutes_included: productMinutes,
                price_per_month: null,
                currency: productData.currency || 'usd',
                is_active: productData.active !== false,
                metadata: productData.metadata || {},
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'gateway_product_id',
              })

            console.log(`[Webhook] Fetched product from DodoPayments: ${productMinutes} minutes`)
          }
        }
      } catch (error) {
        console.error(`[Webhook] Error fetching product:`, error)
      }
    }
  }

  // Log ALL payments (prepaid purchases AND subscription renewals) to prepaid_transactions
  const transactionType = isSubscriptionRenewal ? 'subscription_renewal' : 'purchase'
  
  // Get minutes amount: from metadata first, then from product, then from PRODUCT_MINUTES_MAP fallback
  let minutesAmount = 0
  if (isPrepaid && !isSubscriptionRenewal) {
    // For prepaid purchases, try metadata.minutes first (from checkout, now as string), then product minutes, then PRODUCT_MINUTES_MAP
    // Convert metadata.minutes from string to number if needed (DodoPayments stores metadata as strings)
    const metadataMinutes = metadata.minutes 
      ? (typeof metadata.minutes === 'string' ? parseInt(metadata.minutes, 10) : Number(metadata.minutes))
      : null
    
    minutesAmount = metadataMinutes ||  // Check metadata.minutes first (what we set in checkout)
                   metadata.minutes_amount || 
                   metadata.quantity || 
                   productMinutes ||
                   (productId ? PRODUCT_MINUTES_MAP[productId] : 0) || // Use extracted productId
                   0
    
    console.log('[Webhook] Prepaid minutes calculation:', {
      metadataMinutes: metadata.minutes,
      parsedMetadataMinutes: metadataMinutes,
      metadataMinutesAmount: metadata.minutes_amount,
      metadataQuantity: metadata.quantity,
      productMinutes,
      productId: productId, // Use extracted productId
      mapMinutes: productId ? PRODUCT_MINUTES_MAP[productId] : null,
      finalMinutes: minutesAmount,
    })
  } else if (isSubscriptionRenewal) {
    // Subscription renewals don't add to prepaid balance
    minutesAmount = 0
  }

  await supabase.from('prepaid_transactions').insert({
    user_id: profileId,
    customer_id: customerId,
    transaction_type: transactionType,
    minutes_amount: minutesAmount,
    payment_id: paymentId,
    product_id: productId, // Use extracted productId instead of eventData.product_id
    metadata: {
      amount: eventData.total_amount || eventData.amount || 0,
      currency: eventData.currency || 'USD',
      invoice_id: eventData.invoice_id || paymentId,
      subscription_id: eventData.subscription_id,
      plan_name: planName || eventData.metadata?.plan_name,
      billing_period_start: eventData.billing?.current_period_start,
      billing_period_end: eventData.billing?.current_period_end || eventData.next_billing_date,
      status: eventData.status,
      ...eventData.metadata,
    },
  })

  console.log(`[Webhook] Logged ${transactionType} payment:`, { paymentId, customerId })

  // Handle prepaid balance update (only for prepaid purchases, not subscription renewals)
  if (isPrepaid && !isSubscriptionRenewal && minutesAmount > 0) {
    console.log(`[Webhook] Attempting to update prepaid balance:`, {
      profileId,
      minutesAmount,
      currentBalance: 'fetching...'
    });
    
    // Validate profileId before proceeding
    if (!profileId) {
      console.error(`[Webhook] Cannot update prepaid_minutes - profileId is null/undefined`);
      throw new Error(`Profile ID is required for prepaid balance update`);
    }
    
    // Get current prepaid balance
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('prepaid_minutes')
      .eq('id', profileId)
      .single()

    if (fetchError) {
      console.error(`[Webhook] Failed to fetch current profile for prepaid update:`, fetchError);
      throw fetchError; // Re-throw to fail the webhook so it retries
    }

    if (!currentProfile) {
      console.error(`[Webhook] Profile not found for prepaid update:`, profileId);
      throw new Error(`Profile not found: ${profileId}`);
    }

    const currentBalance = currentProfile?.prepaid_minutes || 0;  // prepaid_minutes now stores seconds
    const secondsToAdd = minutesAmount * 60;  // Convert minutes to seconds
    const newBalance = currentBalance + secondsToAdd;

    console.log(`[Webhook] Updating prepaid balance:`, {
      profileId,
      currentBalance,
      minutesAmount,
      secondsToAdd,
      newBalance
    });

    // Update prepaid_minutes (now stores seconds)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        prepaid_minutes: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (updateError) {
      console.error(`[Webhook] Failed to update prepaid_minutes:`, updateError);
      throw updateError; // Re-throw to fail the webhook so it retries
    }

    console.log(`[Webhook] ✅ Successfully updated prepaid balance: +${minutesAmount} minutes (${secondsToAdd} seconds, new balance: ${newBalance} seconds)`);
  } else if (isPrepaid && !isSubscriptionRenewal && minutesAmount === 0) {
    console.warn(`[Webhook] Prepaid purchase detected but minutesAmount is 0. Product: ${productId}, Metadata:`, eventData.metadata)
  }
}

async function handleSubscriptionCancellation(eventData: any, supabase: any) {
  const customerId = eventData.customer?.customer_id || eventData.customer_id
  const subscriptionId = eventData.subscription_id || eventData.id
  const customerEmail = eventData.customer?.email || eventData.email

  if (!customerId) {
    console.error('[Webhook] No customer_id in cancellation event')
    return
  }

  // Extract metadata from event
  const metadata = eventData.metadata || eventData.customer?.metadata || {}
  const supabaseUserId = metadata.supabase_user_id || metadata.user_id

  // Find profile using metadata or fallback
  let profileId: string | null = null

  if (supabaseUserId) {
    // Direct user_id lookup from metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', supabaseUserId)
      .single()
    
    if (profile) {
      profileId = profile.id
    }
  }

  if (!profileId && customerEmail) {
    // Fallback to email lookup
    profileId = await ensureProfileExistsByEmail(
      supabase,
      customerId,
      customerEmail,
      undefined,
      undefined
    )
  }

  if (!profileId) {
    // Last resort: lookup by customer_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('customer_id', customerId)
      .single()
    
    if (profile) {
      profileId = profile.id
    }
  }

  if (!profileId) {
    console.error('[Webhook] Profile not found for customer:', customerId)
    return
  }

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_gateway_subscription_id', subscriptionId)

  // Optionally remove subscription_id from profile or set limit to 0
  await supabase
    .from('profiles')
    .update({
      subscription_id: null,
      tts_minutes_limit: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
}

