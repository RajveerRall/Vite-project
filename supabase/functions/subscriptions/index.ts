import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import DodoPayments from 'https://esm.sh/dodopayments@2.4.1'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Verify auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Subscriptions] Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Use RPC function for subscription info (recommended)
      const { data: subscriptionInfo, error: rpcError } = await supabase
        .rpc('get_user_subscription_info', { p_user_id: user.id })

      if (rpcError) {
        console.error('[Subscriptions] RPC error:', rpcError)
        // Fallback to manual query
        return await getSubscriptionManually(supabase, user.id)
      }

      return new Response(
        JSON.stringify({ subscription: subscriptionInfo }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { action } = body

      switch (action) {
        case 'create-user':
          return await handleCreateUser(supabase, user)

        case 'cancel':
          return await handleCancelSubscription(supabase, user.id)

        case 'cancel-subscription':
          return await handleCancelSubscriptionViaDodoPayments(supabase, user, body)

        case 'change-plan':
          return await handleChangePlan(supabase, user, body)

        case 'checkout':
          return await handleCheckout(supabase, user, body, req)

        case 'get-customer-by-email':
          return await handleGetCustomerByEmail(supabase, user, body)

        case 'get-subscription-by-id':
          return await handleGetSubscriptionById(supabase, user, body)

        case 'get-customer-payments':
          return await handleGetCustomerPayments(supabase, body)

        case 'download-invoice':
          return await handleDownloadInvoice(supabase, user, body, req)

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action. Valid actions: create-user, cancel, cancel-subscription, change-plan, checkout, get-customer-by-email, get-subscription-by-id, get-customer-payments, download-invoice' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Subscriptions] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCreateUser(supabase: any, user: any) {
  try {
    // Check if profile exists and has customer_id
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.customer_id) {
      return new Response(
        JSON.stringify({ success: true, customer_id: existingProfile.customer_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create customer in DodoPayments
    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'

    if (!dodoApiKey) {
      console.error('[Subscriptions] Missing DODO_PAYMENTS_API_KEY')
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customerName = user.user_metadata?.name || user.email!.split('@')[0] || 'User'

    const customerResponse = await fetch(`${dodoBaseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email!,
        name: customerName,
      }),
    })

    if (!customerResponse.ok) {
      const errorText = await customerResponse.text()
      
      // Handle 409 (already exists) or 400 (bad request) - try to fetch existing customer
      if (customerResponse.status === 409 || customerResponse.status === 400) {
        console.log('[Subscriptions] Customer may already exist, fetching by email...')
        
        const fetchUrl = new URL(`${dodoBaseUrl}/customers`)
        fetchUrl.searchParams.append('email', user.email!)
        const fetchResponse = await fetch(fetchUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${dodoApiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (fetchResponse.ok) {
          const existingData = await fetchResponse.json()
          const customers = Array.isArray(existingData?.items) 
            ? existingData.items 
            : Array.isArray(existingData?.data) 
              ? existingData.data 
              : Array.isArray(existingData) 
                ? existingData 
                : [existingData].filter(Boolean)
          
          if (customers.length > 0) {
            const customerId = customers[0].customer_id || customers[0].id
            
            // Update profile with customer_id
            await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                customer_id: customerId,
                tts_minutes_limit: 0,
                tts_minutes_used: 0,
                prepaid_minutes: 0,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'id',
              })

            return new Response(
              JSON.stringify({ success: true, customer_id: customerId }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      }

      throw new Error(`Failed to create customer: ${errorText}`)
    }

    const customerData = await customerResponse.json()
    const customerId = customerData.customer_id || customerData.id || customerData.data?.customer_id || customerData.data?.id

    if (!customerId) {
      throw new Error('No customer ID returned from DodoPayments')
    }

    // Create or update profile with customer_id
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        customer_id: customerId,
        tts_minutes_limit: 0,
        tts_minutes_used: 0,
        prepaid_minutes: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })

    if (profileError) {
      console.error('[Subscriptions] Failed to update profile:', profileError)
      throw new Error('Failed to save customer ID')
    }

    return new Response(
      JSON.stringify({ success: true, customer_id: customerId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Subscriptions] Create user error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCancelSubscription(supabase: any, userId: string) {
  try {
    // Get current subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_id')
      .eq('id', userId)
      .single()

    if (profile?.subscription_id) {
      // Update subscription status
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.subscription_id)

      if (updateError) {
        throw updateError
      }

      // Optionally cancel in DodoPayments (if needed)
      // This would require calling DodoPayments API
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Subscriptions] Cancel subscription error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCheckout(supabase: any, user: any, body: any, req: Request) {
  try {
    const { product_cart, return_url } = body

    if (!product_cart || !Array.isArray(product_cart) || product_cart.length === 0) {
      return new Response(
        JSON.stringify({ error: 'product_cart is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract IP address from headers
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown'
    
    // Extract user agent
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Get user's customer_id (create if doesn't exist)
    let { data: profile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.customer_id) {
      // Create customer in DodoPayments (reuse create-user logic)
      const createUserResponse = await handleCreateUser(supabase, user)
      if (createUserResponse.status !== 200) {
        return createUserResponse
      }

      const createUserData = await createUserResponse.json()
      if (!createUserData.success || !createUserData.customer_id) {
        return new Response(
          JSON.stringify({ error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      profile = { customer_id: createUserData.customer_id }
    }

    // Get API key with proper validation
    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoEnv = Deno.env.get('DODO_ENV') || 'test_mode' // 'test_mode' | 'live_mode'

    // Validate API key exists and is not empty
    if (!dodoApiKey || typeof dodoApiKey !== 'string' || dodoApiKey.trim().length === 0) {
      console.error('[Subscriptions] DODO_PAYMENTS_API_KEY is missing or invalid:', {
        exists: !!dodoApiKey,
        type: typeof dodoApiKey,
        length: dodoApiKey?.length || 0,
      })
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured - API key missing or invalid' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get origin for return URL
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:5173'
    const defaultReturnUrl = `${origin}/dashboard`

    // Detect if this is a one-time pack purchase
    // Product ID to minutes mapping (from subscription-plans config)
    const PRODUCT_MINUTES_MAP: Record<string, number> = {
      'pdt_DPzwTqAAvyzaIjITvPdS7': 480, // 8 hours one-time pack ($0.99)
      'pdt_8iMQz734nklbq88QlyCBm': 3000, // 50 hours monthly subscription ($5.00) - for reference
    }

    const firstProductId = product_cart[0]?.product_id
    const isOneTimePack = firstProductId && 
                          PRODUCT_MINUTES_MAP[firstProductId] && 
                          firstProductId !== 'pdt_8iMQz734nklbq88QlyCBm' // Exclude subscription product

    // Prepare checkout metadata with user context and IP
    const checkoutMetadata: Record<string, any> = {
      user_id: user.id,
      supabase_user_id: user.id,
      customer_ip: ip,
      user_agent: userAgent,
      checkout_timestamp: new Date().toISOString(),
      source: 'web_checkout',
    }

    // Add metadata to indicate pack purchase if it's a one-time pack
    if (isOneTimePack) {
      checkoutMetadata.type = 'one-time'
      checkoutMetadata.product_type = 'pack'
      checkoutMetadata.minutes = String(PRODUCT_MINUTES_MAP[firstProductId]) // Convert to string (DodoPayments requires string metadata)
      checkoutMetadata.product_id = firstProductId
      console.log('[Subscriptions] Detected one-time pack purchase:', {
        productId: firstProductId,
        minutes: PRODUCT_MINUTES_MAP[firstProductId],
      })
    }

    // Initialize DodoPayments SDK with proper error handling
    let dodoPaymentsClient: any
    try {
      // Safe API key logging - handle edge cases
      const apiKeyPrefix = dodoApiKey.length > 10 
        ? dodoApiKey.substring(0, 10) + '...' 
        : dodoApiKey.substring(0, Math.min(10, dodoApiKey.length)) + '...'
      
      console.log('[Subscriptions] Starting SDK initialization...', {
        hasApiKey: !!dodoApiKey,
        apiKeyLength: dodoApiKey.length,
        apiKeyPrefix: apiKeyPrefix,
        apiKeyStartsWith: dodoApiKey.substring(0, Math.min(3, dodoApiKey.length)),
        environment: dodoEnv,
      })

      // Check if SDK imported correctly
      if (typeof DodoPayments === 'undefined') {
        throw new Error('DodoPayments SDK import failed - module is undefined')
      }

      console.log('[Subscriptions] DodoPayments SDK imported:', {
        dodoPaymentsType: typeof DodoPayments,
        isFunction: typeof DodoPayments === 'function',
        hasDefault: !!(DodoPayments as any)?.default,
      })

      // Try default import first (per SDK docs)
      if (typeof DodoPayments === 'function') {
        console.log('[Subscriptions] Using DodoPayments as function constructor')
        dodoPaymentsClient = new DodoPayments({
          bearerToken: dodoApiKey,
          environment: dodoEnv as 'test_mode' | 'live_mode',
        })
      } else if ((DodoPayments as any)?.default && typeof (DodoPayments as any).default === 'function') {
        console.log('[Subscriptions] Using DodoPayments.default as constructor')
        dodoPaymentsClient = new (DodoPayments as any).default({
          bearerToken: dodoApiKey,
          environment: dodoEnv as 'test_mode' | 'live_mode',
        })
      } else {
        const availableKeys = Object.keys(DodoPayments || {})
        throw new Error(`DodoPayments SDK import failed. Type: ${typeof DodoPayments}, Available keys: ${availableKeys.join(', ')}`)
      }

      console.log('[Subscriptions] SDK client created successfully:', {
        clientType: typeof dodoPaymentsClient,
        hasCheckoutSessions: !!dodoPaymentsClient?.checkoutSessions,
        hasCheckout: !!dodoPaymentsClient?.checkout,
        clientMethods: Object.keys(dodoPaymentsClient || {}).slice(0, 10), // First 10 methods
      })
    } catch (initError: any) {
      console.error('[Subscriptions] SDK initialization failed:', {
        message: initError?.message || 'No message',
        error: initError?.toString() || 'No toString',
        stack: initError?.stack || 'No stack',
        name: initError?.name || 'No name',
        type: typeof initError,
        constructor: initError?.constructor?.name || 'No constructor',
        allKeys: Object.keys(initError || {}),
        stringified: JSON.stringify(initError, Object.getOwnPropertyNames(initError)).substring(0, 2000),
      })
      
      const initErrorMessage = initError?.message || initError?.toString() || JSON.stringify(initError) || 'Unknown initialization error'
      throw new Error(`SDK initialization failed: ${initErrorMessage}`)
    }

    // Create checkout session using SDK
    try {
      // Verify SDK client is valid
      if (!dodoPaymentsClient) {
        throw new Error('DodoPayments SDK client is null or undefined')
      }

      // Verify SDK method exists before calling
      if (!dodoPaymentsClient.checkoutSessions) {
        const availableMethods = Object.keys(dodoPaymentsClient || {})
        console.error('[Subscriptions] checkoutSessions not found. Available methods:', availableMethods)
        throw new Error(`checkoutSessions not found on SDK client. Available methods: ${availableMethods.join(', ')}`)
      }

      if (typeof dodoPaymentsClient.checkoutSessions.create !== 'function') {
        const checkoutSessionsMethods = Object.keys(dodoPaymentsClient.checkoutSessions || {})
        console.error('[Subscriptions] checkoutSessions.create is not a function. Available methods:', checkoutSessionsMethods)
        throw new Error(`checkoutSessions.create is not a function. Available methods: ${checkoutSessionsMethods.join(', ')}`)
      }

      console.log('[Subscriptions] Calling checkoutSessions.create...', {
        productCartLength: product_cart?.length,
        firstProductId: product_cart?.[0]?.product_id,
        customerId: profile.customer_id,
        returnUrl: return_url || defaultReturnUrl,
      })

      const checkoutSession = await dodoPaymentsClient.checkoutSessions.create({
        product_cart,
        customer: {
          customer_id: profile.customer_id,
          email: user.email!,
          metadata: {
            user_id: user.id,
            supabase_user_id: user.id,
          },
        },
        return_url: return_url || defaultReturnUrl,
        metadata: checkoutMetadata,
      })

      console.log('[Subscriptions] SDK checkout session response:', {
        hasCheckoutUrl: !!checkoutSession.checkout_url,
        hasUrl: !!checkoutSession.url,
        hasData: !!checkoutSession.data,
        hasSessionId: !!checkoutSession.session_id,
        sessionKeys: Object.keys(checkoutSession || {}),
        sessionType: typeof checkoutSession,
        fullResponse: JSON.stringify(checkoutSession).substring(0, 500), // First 500 chars for debugging
      })

      // According to SDK docs, response should have checkout_url and session_id
      const checkoutUrl = checkoutSession.checkout_url || checkoutSession.url || checkoutSession.data?.checkout_url

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned from DodoPayments SDK')
      }

      console.log('[Subscriptions] Checkout session created successfully using SDK:', { checkoutUrl })

      return new Response(
        JSON.stringify({ checkout_url: checkoutUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (sdkError: any) {
      console.error('[Subscriptions] SDK checkout error:', {
        message: sdkError?.message,
        error: sdkError?.toString(),
        stack: sdkError?.stack,
        name: sdkError?.name,
        code: sdkError?.code,
        status: sdkError?.status,
        statusText: sdkError?.statusText,
        response: sdkError?.response,
        details: JSON.stringify(sdkError, Object.getOwnPropertyNames(sdkError)).substring(0, 1000),
      })
      
      // Try to extract error message from various possible error formats
      let errorMessage = 'Unknown SDK error'
      if (sdkError?.message) {
        errorMessage = sdkError.message
      } else if (sdkError?.response?.data?.error) {
        errorMessage = sdkError.response.data.error
      } else if (sdkError?.response?.data?.message) {
        errorMessage = sdkError.response.data.message
      } else if (typeof sdkError === 'string') {
        errorMessage = sdkError
      } else if (sdkError?.toString && sdkError.toString() !== '[object Object]') {
        errorMessage = sdkError.toString()
      }
      
      throw new Error(`Checkout failed: ${errorMessage}`)
    }

  } catch (error: any) {
    // Enhanced error logging
    const errorDetails = {
      message: error?.message || 'No message',
      error: error?.toString() || 'No toString',
      stack: error?.stack || 'No stack',
      name: error?.name || 'No name',
      type: typeof error,
      constructor: error?.constructor?.name || 'No constructor',
      allKeys: Object.keys(error || {}),
      stringified: JSON.stringify(error, Object.getOwnPropertyNames(error)).substring(0, 2000),
    }
    
    console.error('[Subscriptions] Checkout error (outer catch):', errorDetails)
    
    // Extract error message more robustly
    let errorMessage = 'Internal server error'
    if (error?.message && error.message.trim()) {
      errorMessage = error.message
    } else if (error?.toString && error.toString() !== '[object Object]' && error.toString() !== 'Error') {
      errorMessage = error.toString()
    } else if (typeof error === 'string' && error.trim()) {
      errorMessage = error
    } else if (error?.stack) {
      errorMessage = `Error: ${error.stack.split('\n')[0]}`
    } else if (errorDetails.stringified && errorDetails.stringified !== '{}') {
      errorMessage = errorDetails.stringified.substring(0, 500)
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getSubscriptionManually(supabase: any, userId: string) {
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_id, customer_id, tts_minutes_limit, tts_minutes_used, prepaid_minutes, last_reset_date')
    .eq('id', userId)
    .single()

  if (!profile) {
    return new Response(
      JSON.stringify({ subscription: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let subscription = null
  let product = null

  if (profile.subscription_id) {
    // Get subscription
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', profile.subscription_id)
      .single()

    subscription = subData

    // Get product if subscription exists
    if (subData?.plan_id) {
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, description, tts_minutes_included, price_per_month, currency')
        .eq('gateway_product_id', subData.plan_id)
        .single()

      product = prodData
    }
  }

  return new Response(
    JSON.stringify({
      subscription: {
        user_id: userId,
        profile,
        subscription,
        product,
      },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetCustomerByEmail(supabase: any, user: any, body: any) {
  try {
    const { email } = body

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if profile exists with customer_id for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.customer_id) {
      return new Response(
        JSON.stringify({ success: true, customer_id: profile.customer_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Not in database - search DodoPayments API
    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'

    if (!dodoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fetchUrl = new URL(`${dodoBaseUrl}/customers`)
    fetchUrl.searchParams.append('email', email)

    const fetchResponse = await fetch(fetchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text()
      console.error('[Subscriptions] Error fetching customer by email:', errorText)
      return new Response(
        JSON.stringify({ error: 'Customer not found in DodoPayments' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingData = await fetchResponse.json()
    const customers = Array.isArray(existingData?.items) 
      ? existingData.items 
      : Array.isArray(existingData?.data) 
        ? existingData.data 
        : Array.isArray(existingData) 
          ? existingData 
          : [existingData].filter(Boolean)
    
    if (customers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customerId = customers[0].customer_id || customers[0].id

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Invalid customer data returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sync to database - update profile with customer_id
    await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        customer_id: customerId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })

    return new Response(
      JSON.stringify({ success: true, customer_id: customerId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Subscriptions] Get customer by email error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetSubscriptionById(supabase: any, user: any, body: any) {
  try {
    const { subscription_id } = body

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check database first
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('payment_gateway_subscription_id', subscription_id)
      .single()

    if (subscription) {
      return new Response(
        JSON.stringify({ success: true, subscription }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Not in database - fetch from DodoPayments API
    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'

    if (!dodoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fetchResponse = await fetch(`${dodoBaseUrl}/subscriptions/${subscription_id}`, {
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text()
      console.error('[Subscriptions] Error fetching subscription:', errorText)
      return new Response(
        JSON.stringify({ error: 'Subscription not found in DodoPayments' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subscriptionData = await fetchResponse.json()
    const dodoSubscription = subscriptionData.data || subscriptionData

    if (!dodoSubscription) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map DodoPayments subscription to our format
    const statusMap: Record<string, string> = {
      active: 'active',
      trial: 'trial',
      cancelled: 'cancelled',
      expired: 'inactive',
      past_due: 'past_due',
      on_hold: 'inactive',
    }
    const mappedStatus = statusMap[dodoSubscription.status] || 'inactive'

    // Get user_id from customer_id if needed
    const customerId = dodoSubscription.customer?.customer_id || dodoSubscription.customer_id
    let userId = user.id

    if (customerId) {
      // Try to find user_id from customer_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('customer_id', customerId)
        .single()
      
      if (profile?.id) {
        userId = profile.id
      }
    }

    // Optionally save to database (if user_id is found)
    if (userId) {
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          payment_gateway_subscription_id: subscription_id,
          plan_id: dodoSubscription.product_id,
          status: mappedStatus,
          current_period_start: dodoSubscription.billing?.current_period_start 
            ? new Date(dodoSubscription.billing.current_period_start).toISOString()
            : null,
          current_period_end: dodoSubscription.next_billing_date || dodoSubscription.billing?.current_period_end
            ? new Date(dodoSubscription.next_billing_date || dodoSubscription.billing.current_period_end).toISOString()
            : null,
          cancel_at_period_end: dodoSubscription.cancel_at_next_billing_date || false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'payment_gateway_subscription_id',
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription: {
          user_id: userId,
          payment_gateway_subscription_id: subscription_id,
          plan_id: dodoSubscription.product_id,
          status: mappedStatus,
          current_period_start: dodoSubscription.billing?.current_period_start 
            ? new Date(dodoSubscription.billing.current_period_start).toISOString()
            : null,
          current_period_end: dodoSubscription.next_billing_date || dodoSubscription.billing?.current_period_end
            ? new Date(dodoSubscription.next_billing_date || dodoSubscription.billing.current_period_end).toISOString()
            : null,
          cancel_at_period_end: dodoSubscription.cancel_at_next_billing_date || false,
          ...dodoSubscription,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Subscriptions] Get subscription by id error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetCustomerPayments(supabase: any, body: any) {
  try {
    const { customer_id } = body

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoEnvironment = Deno.env.get('DODO_PAYMENTS_ENVIRONMENT') || 'test_mode'
    const dodoBaseUrl = dodoEnvironment === 'live_mode' 
      ? 'https://live.dodopayments.com' 
      : 'https://test.dodopayments.com'

    if (!dodoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Subscriptions] Fetching ledger entries for customer:', customer_id)

    // Use ledger entries endpoint - this is the correct endpoint for customer transactions
    const ledgerUrl = new URL(`${dodoBaseUrl}/customers/${customer_id}/wallets/ledger-entries`)
    ledgerUrl.searchParams.append('page_size', '100')
    ledgerUrl.searchParams.append('page_number', '1')

    console.log('[Subscriptions] Ledger entries API URL:', ledgerUrl.toString())

    const ledgerResponse = await fetch(ledgerUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!ledgerResponse.ok) {
      const errorText = await ledgerResponse.text()
      console.error('[Subscriptions] Error fetching ledger entries:', {
        status: ledgerResponse.status,
        statusText: ledgerResponse.statusText,
        error: errorText,
      })
      return new Response(
        JSON.stringify({ error: 'Failed to fetch ledger entries from DodoPayments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ledgerData = await ledgerResponse.json()
    
    // Log structure for debugging
    if (ledgerData?.items?.length > 0) {
      console.log('[Subscriptions] Sample ledger entry:', JSON.stringify(ledgerData.items[0], null, 2))
    }

    const ledgerEntries = Array.isArray(ledgerData?.items)
      ? ledgerData.items
      : Array.isArray(ledgerData?.data)
        ? ledgerData.data
        : Array.isArray(ledgerData)
          ? ledgerData
          : []

    console.log('[Subscriptions] Total ledger entries:', ledgerEntries.length)

    // If ledger entries is empty, try payments endpoint as fallback
    let allPayments: any[] = ledgerEntries

    if (ledgerEntries.length === 0) {
      console.log('[Subscriptions] No ledger entries found, trying payments endpoint as fallback...')
      
      const paymentsUrl = new URL(`${dodoBaseUrl}/payments`)
      paymentsUrl.searchParams.append('page_size', '100')
      paymentsUrl.searchParams.append('page_number', '1')

      const paymentsResponse = await fetch(paymentsUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${dodoApiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        
        // Log structure for debugging
        if (paymentsData?.items?.length > 0) {
          console.log('[Subscriptions] Sample payment from payments endpoint:', JSON.stringify(paymentsData.items[0], null, 2))
        }

        const payments = Array.isArray(paymentsData?.items)
          ? paymentsData.items
          : Array.isArray(paymentsData?.data)
            ? paymentsData.data
            : Array.isArray(paymentsData)
              ? paymentsData
              : []

        // Filter payments by customer_id
        const customerPayments = payments.filter((payment: any) => {
          const paymentCustomerId = payment.customer_id || payment.customer?.customer_id || payment.customer?.id
          return paymentCustomerId === customer_id
        })

        console.log('[Subscriptions] Payments from /payments endpoint:', customerPayments.length)
        allPayments = customerPayments
      } else {
        console.warn('[Subscriptions] Payments endpoint also failed, using empty array')
      }
    }

    if (allPayments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { synced: 0 } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user_id from customer_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('customer_id', customer_id)
      .single()

    if (!profile) {
      console.warn(`[Subscriptions] Profile not found for customer ${customer_id}`)
      return new Response(
        JSON.stringify({ error: 'Profile not found for customer' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = profile.id

    // Pre-fetch product names (batch approach to avoid N+1 queries)
    const productIds = [...new Set(allPayments.map((e: any) => e.product_id).filter(Boolean))]
    const productNameMap = new Map<string, string>()

    console.log(`[Subscriptions] Pre-fetching ${productIds.length} products`)

    for (const productId of productIds) {
      try {
        const productResponse = await fetch(`${dodoBaseUrl}/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${dodoApiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (productResponse.ok) {
          const productData = await productResponse.json()
          const productName = productData.name || productData.data?.name || null
          if (productName) {
            productNameMap.set(productId, productName)
          }
        }
      } catch (err) {
        console.warn(`[Subscriptions] Failed to fetch product ${productId}:`, err)
      }
    }

    let syncedCount = 0
    let errorCount = 0

    // Process each payment/ledger entry
    for (const entry of allPayments) {
      try {
        const paymentId = entry.payment_id || entry.id
        if (!paymentId) {
          console.warn('[Subscriptions] Entry missing payment_id, skipping')
          continue
        }

        // Filter entry types for ledger entries (skip for payments endpoint)
        const entryType = entry.entry_type || entry.type || entry.reason
        if (entryType && !['payment', 'charge', 'purchase'].includes(entryType.toLowerCase())) {
          // Only filter if this is a ledger entry (has entry_type), not a payment
          if (entry.entry_type) {
            console.log(`[Subscriptions] Skipping ledger entry type: ${entryType}`)
            continue
          }
        }

        // Use cached product name
        const planName = entry.product_id ? productNameMap.get(entry.product_id) || null : null

        // Use 'purchase' for all (simplified - or add 'subscription_renewal' to schema CHECK constraint)
        const transactionType = 'purchase'
        const minutesAmount = entry.metadata?.minutes_amount || entry.metadata?.quantity || 0

        // Map payment/ledger entry fields (handle both structures)
        const transactionData = {
          user_id: userId,
          customer_id: customer_id,
          transaction_type: transactionType,
          minutes_amount: minutesAmount,
          payment_id: paymentId,
          product_id: entry.product_id || null,
          metadata: {
            amount: entry.amount || entry.total_amount || 0,
            currency: entry.currency || 'USD',
            invoice_id: entry.invoice_id || paymentId,
            subscription_id: entry.subscription_id || null,
            plan_name: planName,
            billing_period_start: entry.billing?.current_period_start || null,
            billing_period_end: entry.billing?.current_period_end || entry.next_billing_date || null,
            status: entry.status || 'succeeded',
            entry_type: entry.entry_type,
            reason: entry.reason,
            created_at: entry.created_at || entry.timestamp,
          },
          created_at: entry.created_at || entry.timestamp || new Date().toISOString(),
        }

        // Upsert transaction (idempotent - won't duplicate if payment_id already exists)
        const { error: upsertError } = await supabase
          .from('prepaid_transactions')
          .upsert(transactionData, {
            onConflict: 'payment_id',
          })

        if (upsertError) {
          console.error(`[Subscriptions] Failed to upsert payment ${paymentId}:`, upsertError)
          errorCount++
          continue
        }

        syncedCount++
      } catch (entryError: any) {
        console.error('[Subscriptions] Error processing payment:', entryError)
        errorCount++
        continue
      }
    }

    console.log(`[Subscriptions] Synced ${syncedCount} entries (${errorCount} errors)`)

    return new Response(
      JSON.stringify({ success: true, data: { synced: syncedCount, errors: errorCount } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Subscriptions] Get customer payments error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleDownloadInvoice(supabase: any, user: any, body: any, req: Request) {
  try {
    const { payment_id } = body

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoEnv = Deno.env.get('DODO_ENV') || 'test_mode'

    if (!dodoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize DodoPayments SDK
    let dodoPaymentsClient: any
    try {
      if (typeof DodoPayments === 'function') {
        dodoPaymentsClient = new DodoPayments({
          bearerToken: dodoApiKey,
          environment: dodoEnv as 'test_mode' | 'live_mode',
        })
      } else if ((DodoPayments as any)?.default && typeof (DodoPayments as any).default === 'function') {
        dodoPaymentsClient = new (DodoPayments as any).default({
          bearerToken: dodoApiKey,
          environment: dodoEnv as 'test_mode' | 'live_mode',
        })
      } else {
        throw new Error('DodoPayments SDK not available')
      }
    } catch (initError: any) {
      console.error('[Subscriptions] SDK initialization failed:', initError)
      return new Response(
        JSON.stringify({ error: 'SDK initialization failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch invoice PDF using SDK
    try {
      console.log('[Subscriptions] Fetching invoice for payment:', payment_id)
      
      const invoiceResponse = await dodoPaymentsClient.invoices.payments.retrieve(payment_id)
      
      // Handle both Response object and object with blob() method
      let pdfBlob: Blob
      if (invoiceResponse instanceof Response) {
        // If SDK returns Response directly, get blob from it
        pdfBlob = await invoiceResponse.blob()
      } else if (invoiceResponse && typeof (invoiceResponse as any).blob === 'function') {
        // If SDK returns object with blob() method
        pdfBlob = await (invoiceResponse as any).blob()
      } else {
        throw new Error('Invalid invoice response format - expected Response or object with blob() method')
      }
      
      console.log('[Subscriptions] Invoice fetched successfully, size:', pdfBlob.size)

      // Return PDF with proper headers
      return new Response(pdfBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${payment_id}.pdf"`,
        },
      })
    } catch (invoiceError: any) {
      console.error('[Subscriptions] Error fetching invoice:', {
        message: invoiceError?.message,
        error: invoiceError?.toString(),
        stack: invoiceError?.stack,
      })
      
      return new Response(
        JSON.stringify({ error: `Failed to fetch invoice: ${invoiceError?.message || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error: any) {
    console.error('[Subscriptions] Download invoice error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCancelSubscriptionViaDodoPayments(supabase: any, user: any, body: any) {
  try {
    const { subscription_id } = body

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'

    if (!dodoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize DodoPayments SDK
    let dodoPaymentsClient: any
    try {
      if (typeof DodoPayments === 'function') {
        dodoPaymentsClient = new DodoPayments({
          bearerToken: dodoApiKey,
          environment: (Deno.env.get('DODO_ENV') || 'test_mode') as 'test_mode' | 'live_mode',
        })
      } else if ((DodoPayments as any)?.default && typeof (DodoPayments as any).default === 'function') {
        dodoPaymentsClient = new (DodoPayments as any).default({
          bearerToken: dodoApiKey,
          environment: (Deno.env.get('DODO_ENV') || 'test_mode') as 'test_mode' | 'live_mode',
        })
      } else {
        throw new Error('DodoPayments SDK not available')
      }
    } catch (initError: any) {
      console.error('[Subscriptions] SDK initialization failed:', initError)
      throw new Error(`SDK initialization failed: ${initError.message}`)
    }

    // Update subscription to cancel at next billing date
    try {
      if (!dodoPaymentsClient.subscriptions || typeof dodoPaymentsClient.subscriptions.update !== 'function') {
        throw new Error('Subscription update method not available')
      }

      console.log('[Subscriptions] Cancelling subscription via DodoPayments:', subscription_id)

      const updatedSubscription = await dodoPaymentsClient.subscriptions.update(subscription_id, {
        cancel_at_next_billing_date: true,
      })

      console.log('[Subscriptions] Subscription cancelled successfully:', updatedSubscription)

      return new Response(
        JSON.stringify({ success: true, subscription: updatedSubscription }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (sdkError: any) {
      console.error('[Subscriptions] SDK cancel error:', sdkError)
      throw new Error(`Cancel failed: ${sdkError.message || 'Unknown error'}`)
    }
  } catch (error: any) {
    console.error('[Subscriptions] Cancel subscription error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleChangePlan(supabase: any, user: any, body: any) {
  try {
    const { subscription_id, product_id, quantity, proration_billing_mode } = body

    if (!subscription_id || !product_id || !quantity || !proration_billing_mode) {
      return new Response(
        JSON.stringify({ error: 'subscription_id, product_id, quantity, and proration_billing_mode are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')
    const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'

    if (!dodoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize DodoPayments SDK
    let dodoPaymentsClient: any
    try {
      if (typeof DodoPayments === 'function') {
        dodoPaymentsClient = new DodoPayments({
          bearerToken: dodoApiKey,
          environment: (Deno.env.get('DODO_ENV') || 'test_mode') as 'test_mode' | 'live_mode',
        })
      } else if ((DodoPayments as any)?.default && typeof (DodoPayments as any).default === 'function') {
        dodoPaymentsClient = new (DodoPayments as any).default({
          bearerToken: dodoApiKey,
          environment: (Deno.env.get('DODO_ENV') || 'test_mode') as 'test_mode' | 'live_mode',
        })
      } else {
        throw new Error('DodoPayments SDK not available')
      }
    } catch (initError: any) {
      console.error('[Subscriptions] SDK initialization failed:', initError)
      throw new Error(`SDK initialization failed: ${initError.message}`)
    }

    // Change subscription plan
    try {
      if (!dodoPaymentsClient.subscriptions || typeof dodoPaymentsClient.subscriptions.changePlan !== 'function') {
        throw new Error('Subscription changePlan method not available')
      }

      console.log('[Subscriptions] Changing plan via DodoPayments:', {
        subscription_id,
        product_id,
        quantity,
        proration_billing_mode,
      })

      const result = await dodoPaymentsClient.subscriptions.changePlan(subscription_id, {
        product_id,
        quantity,
        proration_billing_mode,
      })

      console.log('[Subscriptions] Plan changed successfully:', result)

      return new Response(
        JSON.stringify({ success: true, result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (sdkError: any) {
      console.error('[Subscriptions] SDK change plan error:', sdkError)
      throw new Error(`Change plan failed: ${sdkError.message || 'Unknown error'}`)
    }
  } catch (error: any) {
    console.error('[Subscriptions] Change plan error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
