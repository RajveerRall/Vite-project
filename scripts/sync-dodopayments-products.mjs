/**
 * Product Sync Script: DodoPayments → Supabase
 * 
 * This script syncs products and prices from DodoPayments API to Supabase database.
 * Run this script once after creating products in DodoPayments, and re-run when products change.
 * 
 * Usage:
 *   node scripts/sync-dodopayments-products.mjs
 * 
 * Environment Variables Required:
 *   - VITE_DODO_API_KEY: Your DodoPayments API key
 *   - VITE_DODO_BASE_URL: DodoPayments API base URL (default: https://test.dodopayments.com)
 *   - VITE_SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (for admin access)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get script directory and project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..'); // Go up one level from scripts/ folder to Vite-project/

// Simple .env parser (loads from project root)
function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env');
    const envFile = readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          // Remove quotes from value if present
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
    console.log(`✅ Loaded .env file from: ${envPath}`);
  } catch (error) {
    console.warn(`⚠️  No .env file found at ${join(projectRoot, '.env')} (or unable to read). Using process.env only.`);
    console.warn(`   Error: ${error.message}`);
  }
}

// Load .env file from project root before reading variables
loadEnv();

// Get environment variables
const DODO_API_KEY = process.env.VITE_DODO_API_KEY || process.env.DODO_API_KEY;
const DODO_BASE_URL = process.env.VITE_DODO_BASE_URL || 'https://test.dodopayments.com';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!DODO_API_KEY) {
  console.error('❌ Missing DODO_API_KEY environment variable');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

// Initialize Supabase client with service role key (for admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Fetch products from DodoPayments API
 */
async function fetchDodoPaymentsProducts() {
  console.log('📦 Fetching products from DodoPayments...');
  
  try {
    const response = await fetch(`${DODO_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DodoPayments API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Handle both array and paginated response formats
    const products = Array.isArray(data) ? data : (data.data || data.products || []);
    
    console.log(`✅ Retrieved ${products.length} products from DodoPayments`);
    return products;
  } catch (error) {
    console.error('❌ Failed to fetch products from DodoPayments:', error.message);
    throw error;
  }
}

/**
 * Fetch prices for a specific product from DodoPayments API
 */
async function fetchDodoPaymentsPrices(productId) {
  console.log(`💵 Fetching prices for product ${productId}...`);
  
  try {
    const response = await fetch(`${DODO_BASE_URL}/prices?product_id=${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DodoPayments API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Handle both array and paginated response formats
    const prices = Array.isArray(data) ? data : (data.data || data.prices || []);
    
    console.log(`✅ Retrieved ${prices.length} prices for product ${productId}`);
    return prices;
  } catch (error) {
    console.error(`❌ Failed to fetch prices for product ${productId}:`, error.message);
    // Don't throw - return empty array so we can continue with other products
    return [];
  }
}

/**
 * Convert DodoPayments product to Supabase format
 */
function mapProductToSupabase(dodoProduct) {
  // Extract tts_minutes_included from metadata or description
  let ttsMinutesIncluded = 0;
  if (dodoProduct.metadata?.tts_minutes_included) {
    ttsMinutesIncluded = parseInt(dodoProduct.metadata.tts_minutes_included, 10);
  } else if (dodoProduct.metadata?.tts_minutes) {
    ttsMinutesIncluded = parseInt(dodoProduct.metadata.tts_minutes, 10);
  } else if (dodoProduct.description) {
    // Try to extract from description (e.g., "8 hours (480 minutes)")
    const match = dodoProduct.description.match(/(\d+)\s*(?:hours|minutes|min)/i);
    if (match) {
      const value = parseInt(match[1], 10);
      // If it's hours, convert to minutes
      if (dodoProduct.description.toLowerCase().includes('hour')) {
        ttsMinutesIncluded = value * 60;
      } else {
        ttsMinutesIncluded = value;
      }
    }
  }

  // Extract price_per_month from prices (for display)
  // This will be handled separately when syncing prices

  return {
    gateway_product_id: dodoProduct.id,
    name: dodoProduct.name || dodoProduct.title || 'Unnamed Product',
    description: dodoProduct.description || null,
    tts_minutes_included: ttsMinutesIncluded,
    price_per_month: null, // Will be calculated from prices
    currency: dodoProduct.currency || 'usd',
    is_active: dodoProduct.active !== false, // Default to true if not specified
    metadata: dodoProduct.metadata || {},
  };
}

/**
 * Convert DodoPayments price to Supabase format
 */
function mapPriceToSupabase(dodoPrice, supabaseProductId) {
  // Map interval to Supabase format
  let interval = 'month'; // Default
  if (dodoPrice.interval) {
    interval = dodoPrice.interval.toLowerCase();
    if (interval === 'one_time' || interval === 'once') {
      // For one-time payments, we'll use 'month' but set interval_count differently
      interval = 'month';
    }
  }

  // Extract unit_amount (in cents)
  const unitAmount = dodoPrice.unit_amount || dodoPrice.amount || 0;

  return {
    product_id: supabaseProductId,
    gateway_price_id: dodoPrice.id,
    unit_amount: unitAmount,
    currency: dodoPrice.currency || 'usd',
    interval: interval,
    interval_count: dodoPrice.interval_count || 1,
    is_active: dodoPrice.active !== false,
    metadata: dodoPrice.metadata || {},
  };
}

/**
 * Sync a single product and its prices to Supabase
 */
async function syncProduct(dodoProduct) {
  console.log(`\n🔄 Syncing product: ${dodoProduct.name || dodoProduct.id}`);

  // Map product to Supabase format
  const supabaseProduct = mapProductToSupabase(dodoProduct);

  // Upsert product (insert or update if exists)
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('id, price_per_month')
    .eq('gateway_product_id', dodoProduct.id)
    .single();

  let supabaseProductId;
  let existingPricePerMonth = null;

  if (existingProduct) {
    supabaseProductId = existingProduct.id;
    existingPricePerMonth = existingProduct.price_per_month;
    console.log(`   Found existing product in Supabase: ${supabaseProductId}`);
  }

  const { data: upsertedProduct, error: upsertError } = await supabase
    .from('products')
    .upsert(
      {
        ...supabaseProduct,
        // Preserve price_per_month if we're updating and it exists
        ...(existingPricePerMonth !== null ? { price_per_month: existingPricePerMonth } : {}),
      },
      {
        onConflict: 'gateway_product_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (upsertError) {
    console.error(`   ❌ Failed to upsert product:`, upsertError);
    throw upsertError;
  }

  supabaseProductId = upsertedProduct.id;
  console.log(`   ✅ Product synced: ${supabaseProductId}`);

  // Fetch and sync prices for this product
  const dodoPrices = await fetchDodoPaymentsPrices(dodoProduct.id);
  
  if (dodoPrices.length === 0) {
    console.log(`   ⚠️  No prices found for this product`);
    return { product: upsertedProduct, prices: [] };
  }

  // Sync each price
  const syncedPrices = [];
  let lowestPricePerMonth = null;

  for (const dodoPrice of dodoPrices) {
    const supabasePrice = mapPriceToSupabase(dodoPrice, supabaseProductId);

    const { data: upsertedPrice, error: priceError } = await supabase
      .from('prices')
      .upsert(supabasePrice, {
        onConflict: 'gateway_price_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (priceError) {
      console.error(`   ❌ Failed to upsert price ${dodoPrice.id}:`, priceError);
      continue; // Skip this price but continue with others
    }

    syncedPrices.push(upsertedPrice);
    console.log(`   ✅ Price synced: ${upsertedPrice.gateway_price_id} (${supabasePrice.unit_amount / 100} ${supabasePrice.currency})`);

    // Calculate price_per_month for the product (use lowest monthly price)
    if (supabasePrice.interval === 'month' && supabasePrice.interval_count === 1) {
      const pricePerMonth = supabasePrice.unit_amount;
      if (!lowestPricePerMonth || pricePerMonth < lowestPricePerMonth) {
        lowestPricePerMonth = pricePerMonth;
      }
    }
  }

  // Update product's price_per_month if we found a monthly price
  if (lowestPricePerMonth !== null && lowestPricePerMonth !== existingPricePerMonth) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ price_per_month: lowestPricePerMonth })
      .eq('id', supabaseProductId);

    if (updateError) {
      console.warn(`   ⚠️  Failed to update price_per_month:`, updateError);
    } else {
      console.log(`   ✅ Updated price_per_month: ${lowestPricePerMonth / 100}`);
    }
  }

  return { product: upsertedProduct, prices: syncedPrices };
}

/**
 * Main sync function
 */
async function syncProducts() {
  console.log('🚀 Starting DodoPayments → Supabase product sync...\n');
  console.log(`📡 DodoPayments API: ${DODO_BASE_URL}`);
  console.log(`💾 Supabase: ${SUPABASE_URL}\n`);

  try {
    // Fetch all products from DodoPayments
    const dodoProducts = await fetchDodoPaymentsProducts();

    if (dodoProducts.length === 0) {
      console.log('⚠️  No products found in DodoPayments');
      return;
    }

    // Sync each product
    const results = [];
    for (const product of dodoProducts) {
      try {
        const result = await syncProduct(product);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to sync product ${product.id}:`, error);
        // Continue with other products
      }
    }

    // Summary
    console.log('\n📊 Sync Summary:');
    console.log(`   Products synced: ${results.length}`);
    const totalPrices = results.reduce((sum, r) => sum + r.prices.length, 0);
    console.log(`   Prices synced: ${totalPrices}`);
    console.log('\n✅ Product sync completed successfully!');

  } catch (error) {
    console.error('\n❌ Product sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncProducts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

