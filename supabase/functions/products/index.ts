import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'GET') {
      // List active products (public, no auth required)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          prices (
            id,
            gateway_price_id,
            unit_amount,
            currency,
            interval,
            interval_count,
            is_active
          )
        `)
        .eq('is_active', true)
        .order('price_per_month', { ascending: true })

      if (productsError) {
        throw productsError
      }

      return new Response(
        JSON.stringify({ products: products || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Sync products from DodoPayments (admin only)
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify service role key (admin only)
      const token = authHeader.replace('Bearer ', '')
      if (token !== supabaseServiceKey) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - service role required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY')!
      const dodoBaseUrl = Deno.env.get('DODO_BASE_URL') || 'https://test.dodopayments.com'

      if (!dodoApiKey) {
        return new Response(
          JSON.stringify({ error: 'DodoPayments API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch products from DodoPayments
      const productsResponse = await fetch(`${dodoBaseUrl}/products`, {
        headers: {
          'Authorization': `Bearer ${dodoApiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!productsResponse.ok) {
        const errorText = await productsResponse.text()
        throw new Error(`Failed to fetch products: ${errorText}`)
      }

      const productsData = await productsResponse.json()
      const products = Array.isArray(productsData) 
        ? productsData 
        : (productsData.items || productsData.data || [])

      const syncedProducts = []

      for (const dodoProduct of products) {
        // Extract tts_minutes_included from metadata
        const ttsMinutes = dodoProduct.metadata?.tts_minutes_included || 
                          dodoProduct.metadata?.tts_minutes || 0

        // Upsert product
        const { data: product, error: productError } = await supabase
          .from('products')
          .upsert({
            gateway_product_id: dodoProduct.id,
            name: dodoProduct.name || dodoProduct.title,
            description: dodoProduct.description,
            tts_minutes_included: parseInt(String(ttsMinutes), 10),
            price_per_month: null, // Will be updated from prices
            currency: dodoProduct.currency || 'usd',
            is_active: dodoProduct.active !== false,
            metadata: dodoProduct.metadata || {},
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'gateway_product_id',
          })
          .select()
          .single()

        if (productError) {
          console.error(`[Sync] Failed to upsert product ${dodoProduct.id}:`, productError)
          continue
        }

        // Fetch prices for this product
        const pricesResponse = await fetch(`${dodoBaseUrl}/prices?product_id=${dodoProduct.id}`, {
          headers: {
            'Authorization': `Bearer ${dodoApiKey}`,
            'Content-Type': 'application/json',
          },
        })

        let lowestMonthlyPrice = null

        if (pricesResponse.ok) {
          const pricesData = await pricesResponse.json()
          const prices = Array.isArray(pricesData) 
            ? pricesData 
            : (pricesData.items || pricesData.data || [])

          for (const dodoPrice of prices) {
            const interval = dodoPrice.interval?.toLowerCase() || 'month'
            const unitAmount = dodoPrice.unit_amount || dodoPrice.amount || 0

            // Upsert price
            await supabase
              .from('prices')
              .upsert({
                product_id: product.id,
                gateway_price_id: dodoPrice.id,
                unit_amount: unitAmount,
                currency: dodoPrice.currency || 'usd',
                interval: interval === 'one_time' || interval === 'once' ? 'month' : interval,
                interval_count: dodoPrice.interval_count || 1,
                is_active: dodoPrice.active !== false,
                metadata: dodoPrice.metadata || {},
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'gateway_price_id',
              })

            // Track lowest monthly price
            if (interval === 'month' && (!lowestMonthlyPrice || unitAmount < lowestMonthlyPrice)) {
              lowestMonthlyPrice = unitAmount
            }
          }
        }

        // Update product's price_per_month
        if (lowestMonthlyPrice !== null) {
          await supabase
            .from('products')
            .update({ price_per_month: lowestMonthlyPrice })
            .eq('id', product.id)
        }

        syncedProducts.push(product)
      }

      return new Response(
        JSON.stringify({
          success: true,
          synced: syncedProducts.length,
          products: syncedProducts,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Products] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

