// // DodoPayments API Proxy - Server-side routes
// // Prevents exposing API key in client code and resolves CORS issues

// const express = require('express');
// const router = express.Router();

// const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY || process.env.VITE_DODO_API_KEY;
// const DODO_BASE_URL = process.env.DODO_BASE_URL || process.env.VITE_DODO_BASE_URL || 'https://test.dodopayments.com';

// if (!DODO_API_KEY) {
//   console.warn('[DodoPayments Proxy] Warning: DODO_PAYMENTS_API_KEY not found in environment variables');
// }

// /**
//  * GET /api/dodopayments/customers/:customer_id/wallets/ledger-entries?page_size=50&page_number=1&currency=USD
//  * List ledger entries (transaction history) for a customer (server-side proxy)
//  * This is the correct endpoint for fetching customer transaction history
//  */
// router.get('/customers/:customer_id/wallets/ledger-entries', async (req, res) => {
//   try {
//     const { customer_id } = req.params;
//     const { page_size = 50, page_number = 1, currency } = req.query;
    
//     if (!customer_id) {
//       return res.status(400).json({ error: 'customer_id is required' });
//     }

//     if (!DODO_API_KEY) {
//       return res.status(500).json({ error: 'DodoPayments API key not configured' });
//     }

//     const url = new URL(`${DODO_BASE_URL}/customers/${customer_id}/wallets/ledger-entries`);
//     url.searchParams.append('page_size', String(page_size));
//     url.searchParams.append('page_number', String(page_number));
//     if (currency) {
//       url.searchParams.append('currency', currency);
//     }

//     console.log('[DodoPayments Proxy] Fetching ledger entries:', { customer_id, page_size, page_number, currency });

//     const response = await fetch(url.toString(), {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${DODO_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[DodoPayments Proxy] Error fetching ledger entries:', {
//         status: response.status,
//         error: errorText,
//         customer_id,
//       });
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
    
//     // ADD COMPREHENSIVE DEBUG LOGGING:
//     console.log('[DodoPayments Proxy] ========== LEDGER ENTRIES RESPONSE DEBUG ==========');
//     console.log('[DodoPayments Proxy] Response type:', typeof data);
//     console.log('[DodoPayments Proxy] Is array:', Array.isArray(data));
//     console.log('[DodoPayments Proxy] Response keys:', Object.keys(data || {}));
//     console.log('[DodoPayments Proxy] Has items:', !!data?.items);
//     console.log('[DodoPayments Proxy] Items length:', data?.items?.length);
//     console.log('[DodoPayments Proxy] Has data:', !!data?.data);
//     console.log('[DodoPayments Proxy] Data length:', data?.data?.length);
//     if (data?.items?.[0]) {
//       console.log('[DodoPayments Proxy] First ledger entry keys:', Object.keys(data.items[0]));
//       console.log('[DodoPayments Proxy] First ledger entry type:', data.items[0].entry_type);
//       console.log('[DodoPayments Proxy] First ledger entry amount:', data.items[0].amount);
//       console.log('[DodoPayments Proxy] First ledger entry currency:', data.items[0].currency);
//       console.log('[DodoPayments Proxy] First ledger entry payment_id:', data.items[0].payment_id);
//       console.log('[DodoPayments Proxy] First ledger entry reason:', data.items[0].reason);
//     }
//     if (data?.data?.[0]) {
//       console.log('[DodoPayments Proxy] First data item keys:', Object.keys(data.data[0]));
//     }
//     if (Array.isArray(data) && data[0]) {
//       console.log('[DodoPayments Proxy] First array item keys:', Object.keys(data[0]));
//     }
//     console.log('[DodoPayments Proxy] Full response (first 3000 chars):', JSON.stringify(data).substring(0, 3000));
//     console.log('[DodoPayments Proxy] ============================================');
    
//     // Return the raw response (client will parse items)
//     console.log('[DodoPayments Proxy] Successfully fetched ledger entries');
//     res.json(data);
//   } catch (error) {
//     console.error('[DodoPayments Proxy] Exception:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * GET /api/dodopayments/payments/all?page_size=100&page_number=1
//  * Fetch ALL payments (for debugging - no customer_id filter)
//  * This helps verify if payments exist and what their structure is
//  */
// router.get('/payments/all', async (req, res) => {
//   try {
//     const { page_size = 100, page_number = 1 } = req.query;
    
//     if (!DODO_API_KEY) {
//       return res.status(500).json({ error: 'DodoPayments API key not configured' });
//     }

//     const url = new URL(`${DODO_BASE_URL}/payments`);
//     url.searchParams.append('page_size', String(page_size));
//     url.searchParams.append('page_number', String(page_number));

//     console.log('[DodoPayments Proxy] Fetching ALL payments (no filter):', { page_size, page_number });

//     const response = await fetch(url.toString(), {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${DODO_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[DodoPayments Proxy] Error fetching all payments:', {
//         status: response.status,
//         error: errorText,
//       });
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
    
//     console.log('[DodoPayments Proxy] ========== ALL PAYMENTS DEBUG ==========');
//     console.log('[DodoPayments Proxy] Total items:', data?.items?.length || 0);
//     if (data?.items && data.items.length > 0) {
//       console.log('[DodoPayments Proxy] First payment:', JSON.stringify(data.items[0], null, 2));
//       console.log('[DodoPayments Proxy] First payment customer_id:', data.items[0].customer_id);
//       console.log('[DodoPayments Proxy] First payment status:', data.items[0].status);
//       console.log('[DodoPayments Proxy] First payment payment_id:', data.items[0].payment_id || data.items[0].id);
//     }
//     console.log('[DodoPayments Proxy] ============================================');
    
//     res.json(data);
//   } catch (error) {
//     console.error('[DodoPayments Proxy] Exception:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * GET /api/dodopayments/payments?customer_id=xxx&page_size=50&page_number=1
//  * List payments for a customer (server-side proxy)
//  * 
//  * DEPRECATED: Payments are now synced via webhooks and queried from database directly
//  * This route is kept for gradual migration but should not be used
//  */
// /*
// router.get('/payments', async (req, res) => {
//   try {
//     const { customer_id, page_size = 50, page_number = 1 } = req.query;
    
//     if (!customer_id) {
//       return res.status(400).json({ error: 'customer_id is required' });
//     }

//     if (!DODO_API_KEY) {
//       return res.status(500).json({ error: 'DodoPayments API key not configured' });
//     }

//     // Fetch ALL payments - API may not support customer_id filter reliably
//     // Fetch more pages to ensure we get customer's payments
//     const url = new URL(`${DODO_BASE_URL}/payments`);
//     url.searchParams.append('page_size', String(Math.max(100, parseInt(page_size) || 50)));
//     url.searchParams.append('page_number', String(page_number));

//     console.log('[DodoPayments Proxy] Fetching payments (will filter by customer_id):', { customer_id, page_size, page_number });

//     const response = await fetch(url.toString(), {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${DODO_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[DodoPayments Proxy] Error fetching payments:', {
//         status: response.status,
//         error: errorText,
//         customer_id,
//       });
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
    
//     // Filter by customer_id client-side
//     let filteredItems = [];
//     if (Array.isArray(data?.items)) {
//       filteredItems = data.items.filter(payment => {
//         const paymentCustomerId = payment.customer_id || payment.customer?.id;
//         return paymentCustomerId === customer_id;
//       });
//     } else if (Array.isArray(data?.data)) {
//       filteredItems = data.data.filter(payment => {
//         const paymentCustomerId = payment.customer_id || payment.customer?.id;
//         return paymentCustomerId === customer_id;
//       });
//     } else if (Array.isArray(data)) {
//       filteredItems = data.filter(payment => {
//         const paymentCustomerId = payment.customer_id || payment.customer?.id;
//         return paymentCustomerId === customer_id;
//       });
//     }
    
//     console.log('[DodoPayments Proxy] ========== PAYMENTS RESPONSE DEBUG ==========');
//     console.log('[DodoPayments Proxy] Total payments fetched:', data?.items?.length || data?.data?.length || (Array.isArray(data) ? data.length : 0));
//     console.log('[DodoPayments Proxy] Payments for customer:', filteredItems.length);
//     if (filteredItems.length > 0) {
//       console.log('[DodoPayments Proxy] First payment keys:', Object.keys(filteredItems[0]));
//       console.log('[DodoPayments Proxy] First payment status:', filteredItems[0].status);
//       console.log('[DodoPayments Proxy] First payment payment_id:', filteredItems[0].payment_id || filteredItems[0].id);
//       console.log('[DodoPayments Proxy] First payment customer_id:', filteredItems[0].customer_id);
//       console.log('[DodoPayments Proxy] First payment:', JSON.stringify(filteredItems[0], null, 2));
//     }
//     console.log('[DodoPayments Proxy] ============================================');
    
//     // Return filtered results in same format
//     res.json({
//       items: filteredItems,
//       ...(data.page_number && { page_number: data.page_number }),
//       ...(data.page_size && { page_size: data.page_size }),
//       ...(data.total && { total: filteredItems.length }),
//     });
//   } catch (error) {
//     console.error('[DodoPayments Proxy] Exception:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * GET /api/dodopayments/customers?email=xxx
//  * Find customer by email (server-side proxy)
//  */
// router.get('/customers', async (req, res) => {
//   try {
//     const { email } = req.query;
    
//     if (!email) {
//       return res.status(400).json({ error: 'email is required' });
//     }

//     if (!DODO_API_KEY) {
//       return res.status(500).json({ error: 'DodoPayments API key not configured' });
//     }

//     const url = new URL(`${DODO_BASE_URL}/customers`);
//     url.searchParams.append('email', email);

//     console.log('[DodoPayments Proxy] Fetching customer by email:', email);

//     const response = await fetch(url.toString(), {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${DODO_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[DodoPayments Proxy] Error fetching customer:', {
//         status: response.status,
//         error: errorText,
//       });
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
//     console.log('[DodoPayments Proxy] Successfully fetched customer');
//     res.json(data);
//   } catch (error) {
//     console.error('[DodoPayments Proxy] Exception:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * POST /api/dodopayments/customers
//  * Create customer (server-side proxy)
//  */
// router.post('/customers', async (req, res) => {
//   try {
//     const { email, name, metadata } = req.body;
    
//     if (!email) {
//       return res.status(400).json({ error: 'email is required' });
//     }

//     if (!DODO_API_KEY) {
//       return res.status(500).json({ error: 'DodoPayments API key not configured' });
//     }

//     // Derive name if not provided
//     const customerName = name || email.split('@')[0] || 'User';

//     console.log('[DodoPayments Proxy] Creating customer:', { email, name: customerName });

//     const response = await fetch(`${DODO_BASE_URL}/customers`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${DODO_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         email,
//         name: customerName,
//         metadata,
//       }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
      
//       // Handle 409 (already exists) or 400 (bad request) - try to fetch existing customer
//       if (response.status === 409 || response.status === 400) {
//         console.log('[DodoPayments Proxy] Customer may already exist, fetching by email...');
        
//         const fetchUrl = new URL(`${DODO_BASE_URL}/customers`);
//         fetchUrl.searchParams.append('email', email);
//         const fetchResponse = await fetch(fetchUrl.toString(), {
//           headers: {
//             'Authorization': `Bearer ${DODO_API_KEY}`,
//             'Content-Type': 'application/json',
//           },
//         });
        
//         if (fetchResponse.ok) {
//           const existingData = await fetchResponse.json();
//           return res.json(existingData);
//         }
//       }
      
//       console.error('[DodoPayments Proxy] Error creating customer:', {
//         status: response.status,
//         error: errorText,
//       });
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
//     console.log('[DodoPayments Proxy] Successfully created customer');
//     res.json(data);
//   } catch (error) {
//     console.error('[DodoPayments Proxy] Exception:', error);
//     res.status(500).json({ error: error.message });
//   }
// });
// */

// /**
//  * GET /api/dodopayments/subscriptions?customer_id=xxx
//  * List subscriptions for a customer (server-side proxy)
//  * 
//  * DEPRECATED: Subscriptions are now synced via webhooks and queried from database directly
//  * This route is kept for gradual migration but should not be used
//  */
// /*
// router.get('/subscriptions', async (req, res) => {
//   try {
//     const { customer_id } = req.query;
    
//     if (!customer_id) {
//       return res.status(400).json({ error: 'customer_id is required' });
//     }

//     if (!DODO_API_KEY) {
//       return res.status(500).json({ error: 'DodoPayments API key not configured' });
//     }

//     const url = new URL(`${DODO_BASE_URL}/subscriptions`);
//     url.searchParams.append('customer_id', customer_id);

//     console.log('[DodoPayments Proxy] Fetching subscriptions:', { customer_id });

//     const response = await fetch(url.toString(), {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${DODO_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[DodoPayments Proxy] Error fetching subscriptions:', {
//         status: response.status,
//         error: errorText,
//         customer_id,
//       });
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
//     console.log('[DodoPayments Proxy] Successfully fetched subscriptions');
//     res.json(data);
//   } catch (error) {
//     console.error('[DodoPayments Proxy] Exception:', error);
//     res.status(500).json({ error: error.message });
//   }
// });
// */

// /**
//  * GET /api/dodopayments/subscriptions/:id
//  * Get subscription details by ID (server-side proxy)
//  * 
//  * DEPRECATED: Use Edge Function /functions/v1/subscriptions with action 'get-subscription-by-id' instead
//  * This route is kept for gradual migration but should not be used
//  */
// /*
// router.get('/subscriptions/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     if (!id) {
//       return res.status(400).json({ error: 'subscription ID is required' });
//     }

//     if (!DODO_API_KEY) {
//       return res.status(500).json({ error: 'DodoPayments API key not configured' });
//     }

//     console.log('[DodoPayments Proxy] Fetching subscription:', { id });

//     const response = await fetch(`${DODO_BASE_URL}/subscriptions/${id}`, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${DODO_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[DodoPayments Proxy] Error fetching subscription:', {
//         status: response.status,
//         error: errorText,
//         id,
//       });
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
//     console.log('[DodoPayments Proxy] Successfully fetched subscription');
//     res.json(data);
//   } catch (error) {
//     console.error('[DodoPayments Proxy] Exception:', error);
//     res.status(500).json({ error: error.message });
//   }
// });
// */

// module.exports = router;

