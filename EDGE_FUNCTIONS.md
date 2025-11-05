# Edge Functions Architecture

## Overview

This project uses Supabase Edge Functions for subscription and payment APIs, while keeping the Express server for TTS functionality only. Edge Functions provide serverless, scalable endpoints with built-in authentication and direct database access.

## Architecture

```
Frontend (Vite + React)
    ↓ HTTP requests with Supabase auth token
Supabase Edge Functions
    ├── /functions/v1/subscriptions     (Protected - all subscription operations)
    ├── /functions/v1/products          (Public - list products, Admin - sync)
    ├── /functions/v1/dodo-webhook      (Public - webhook signature verified)
    └── /functions/v1/increment-usage   (Protected - track TTS usage)
    ↓
Supabase Database (direct access)
    ↓
DodoPayments API (via Edge Function)

Express Server (server.cjs)
    ├── /api/tts                        (TTS functionality)
    ├── /api/dodopayments/*             (Proxy - gradual migration)
    └── Static file serving
```

## Edge Functions

### subscriptions

**Endpoint:** `GET /functions/v1/subscriptions` or `POST /functions/v1/subscriptions`

**Auth:** Required (Supabase JWT token)

**GET:** Fetch user subscription info
- Uses RPC function `get_user_subscription_info()`
- Returns profile, subscription, and product details

**POST:** Handle subscription-related actions via `action` parameter:
- `action: "create-user"` - Create DodoPayments customer
- `action: "cancel"` - Cancel subscription
- `action: "checkout"` - Create checkout session

**Response (GET):**
```json
{
  "subscription": {
    "user_id": "uuid",
    "profile": {
      "tts_minutes_limit": 1000,
      "tts_minutes_used": 500,
      "prepaid_minutes": 100,
      "last_reset_date": "2024-01-01T00:00:00Z"
    },
    "subscription": {
      "id": "uuid",
      "status": "active",
      "plan_id": "dodo_product_123",
      "current_period_end": "2024-02-01T00:00:00Z",
      ...
    },
    "product": {
      "name": "Pro Plan",
      "tts_minutes_included": 1000,
      "price_per_month": 999,
      ...
    }
  }
}
```

**POST Actions:**

**1. Create User (`action: "create-user"`)**
- **Request:** `{ action: "create-user" }`
- **Response:**
```json
{
  "success": true,
  "customer_id": "dodo_customer_123"
}
```
- **Flow:**
  1. Verify auth token
  2. Check if profile exists with customer_id
  3. If not, create customer in DodoPayments
  4. Upsert profile with customer_id
  5. Return customer_id

**2. Cancel Subscription (`action: "cancel"`)**
- **Request:** `{ action: "cancel" }`
- **Response:**
```json
{
  "success": true
}
```
- **Flow:**
  1. Get current subscription from profile
  2. Update subscription status to 'cancelled'
  3. Set `cancel_at_period_end: true`

**3. Create Checkout (`action: "checkout"`)**
- **Request:**
```json
{
  "action": "checkout",
  "product_cart": [
    {
      "product_id": "dodo_product_123",
      "quantity": 1
    }
  ],
  "return_url": "https://example.com/dashboard"
}
```
- **Response:**
```json
{
  "checkout_url": "https://checkout.dodopayments.com/..."
}
```
- **Flow:**
  1. Verify auth token
  2. Get or create DodoPayments customer (calls create-user action internally if needed)
  3. Create checkout session via DodoPayments API
  4. Return checkout URL

---

### products

**Endpoint:** `GET /functions/v1/products` or `POST /functions/v1/products`

**GET:** List active products (Public, no auth required)

**POST:** Sync products from DodoPayments (Admin only, requires service role key)

**Response (GET):**
```json
{
  "products": [
    {
      "id": "uuid",
      "gateway_product_id": "dodo_product_123",
      "name": "Pro Plan",
      "tts_minutes_included": 1000,
      "price_per_month": 999,
      "prices": [...]
    }
  ]
}
```

**POST Flow:**
1. Verify service role key (admin only)
2. Fetch products from DodoPayments API
3. Upsert products and prices tables
4. Calculate `price_per_month` from prices
5. Return sync results

---

### dodo-webhook

**Endpoint:** `POST /functions/v1/dodo-webhook`

**Auth:** None (signature verified via DodoPayments SDK)

**Purpose:** Handle DodoPayments webhook events

**Supported Events:**
- `subscription.created` / `subscription.updated`
- `payment.succeeded` (for prepaid purchases)
- `subscription.cancelled` / `subscription.deleted`

**Flow:**
1. Verify webhook signature using DodoPayments SDK
2. Parse event payload
3. Map `customer_id` → `user_id` via profiles table
4. Update subscriptions table
5. Update profiles with subscription_id and tts_minutes_limit
6. Handle prepaid transactions (update prepaid_minutes, log to prepaid_transactions)

**Security:**
- Webhook signature verification prevents unauthorized requests
- Idempotency via `webhook-id` header (optional)

---

### increment-usage

**Endpoint:** `POST /functions/v1/increment-usage`

**Auth:** Required (Supabase JWT token)

**Purpose:** Track TTS usage and check limits

**Request:**
```json
{
  "seconds": 60,
  "source": "reader",
  "event_id": "unique_event_id" // optional, for idempotency
}
```

**Response:**
```json
{
  "success": true
}
```

**Error Response (429 - Limit Exceeded):**
```json
{
  "error": "Usage limit exceeded",
  "limit_exceeded": true
}
```

**Flow:**
1. Verify auth token
2. Call RPC function `increment_tts_usage()`
3. Function handles:
   - Prepaid consumption (consumes prepaid first)
   - Subscription limit checking
   - Usage tracking in multiple tables
   - Idempotency via event_id

---

## Frontend Integration

### API Client

Located at `src/services/api.ts`

- Automatically injects Supabase auth token
- Handles 401 errors (token refresh)
- Handles 429 errors (limit exceeded)
- Typed responses with TypeScript

**Usage:**
```typescript
import { api } from '@/services/api'

// GET request
const response = await api.get('/subscriptions')

// POST request with action
const response = await api.post('/subscriptions', { action: 'checkout', product_cart: [...] })
const createUserResponse = await api.post('/subscriptions', { action: 'create-user' })
```

### React Hooks

**useSubscription** (`src/hooks/useSubscription.ts`)
- Fetches user subscription info
- Returns: `{ subscription, loading, error, refetch }`

**useProducts** (`src/hooks/useProducts.ts`)
- Fetches active products list
- Returns: `{ products, loading, error, refetch }`

**useCheckout** (`src/hooks/useCheckout.ts`)
- Creates checkout sessions
- Returns: `{ createCheckout, loading, error }`

**useUsage** (`src/hooks/useUsage.ts`)
- Increments TTS usage
- Returns: `{ incrementUsage, loading, error, limitExceeded }`

**Usage Example:**
```typescript
import { useSubscription } from '@/hooks/useSubscription'

function MyComponent() {
  const { subscription, loading, error } = useSubscription()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return <div>Plan: {subscription?.product?.name}</div>
}
```

---

## Local Development

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project (optional, for local development):
```bash
supabase link --project-ref your-project-ref
```

### Running Functions Locally

```bash
# Serve all functions locally
npm run supabase:functions:dev

# Or using Supabase CLI directly
supabase functions serve
```

Functions will be available at:
- `http://localhost:54321/functions/v1/subscriptions`
- `http://localhost:54321/functions/v1/products`
- etc.

### Testing Functions

You can test functions using curl or your API client:

```bash
# Test create-user action (requires auth token)
curl -X POST http://localhost:54321/functions/v1/subscriptions \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"create-user"}'

# Test checkout action
curl -X POST http://localhost:54321/functions/v1/subscriptions \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"checkout","product_cart":[{"product_id":"dodo_product_123"}]}'

# Test products (public)
curl http://localhost:54321/functions/v1/products
```

---

## Deployment

### Deploy All Functions

```bash
# Deploy all functions
npm run supabase:functions:deploy

# Or deploy individually
supabase functions deploy subscriptions
supabase functions deploy products
supabase functions deploy dodo-webhook
supabase functions deploy increment-usage
```

### Deploy Webhook Only

```bash
npm run supabase:functions:deploy:webhook
```

### Environment Variables

Set in Supabase Dashboard → Edge Functions → Settings:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)
- `DODO_PAYMENTS_API_KEY` - DodoPayments API key
- `DODO_BASE_URL` - DodoPayments API URL (default: `https://test.dodopayments.com`)
- `DODO_WEBHOOK_SECRET` or `DODO_WEBHOOK_KEY` - Webhook verification secret

### Function URLs

After deployment, functions are available at:
- `https://[project-ref].supabase.co/functions/v1/[function-name]`

Example:
- `https://abcdefghijklmnop.supabase.co/functions/v1/subscriptions`
- `https://abcdefghijklmnop.supabase.co/functions/v1/dodo-webhook`

---

## Webhook Configuration

### Update DodoPayments Dashboard

1. Go to DodoPayments Dashboard → Webhooks
2. Set webhook URL to: `https://[project-ref].supabase.co/functions/v1/dodo-webhook`
3. Select events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.cancelled`
   - `payment.succeeded`

### Testing Webhooks

You can test webhooks using DodoPayments dashboard or by sending test events:

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/dodo-webhook \
  -H "Content-Type: application/json" \
  -H "webhook-id: test_123" \
  -H "webhook-signature: ..." \
  -H "webhook-timestamp: ..." \
  -d '{"type":"subscription.created","data":{...}}'
```

---

## Monitoring

### View Function Logs

```bash
# View logs for all functions
npm run supabase:functions:logs

# View logs for specific function
supabase functions logs dodo-webhook

# Follow logs in real-time
supabase functions logs dodo-webhook --follow
```

### Supabase Dashboard

- Go to Supabase Dashboard → Edge Functions
- View execution metrics, errors, and logs for each function
- Monitor function execution times and success rates

---

## Migration Notes

### Express Server

The Express server (`server.cjs`) now only handles:
- TTS functionality (`/api/tts`)
- DodoPayments proxy routes (`/api/dodopayments/*`) - kept for gradual migration
- Static file serving
- Health check (`/health`)

**Removed:**
- Subscription webhook handler (now Edge Function)

### Gradual Migration

During migration, you can:
1. Keep Express proxy routes active
2. Test Edge Functions in parallel
3. Switch frontend to use Edge Functions
4. Eventually remove Express proxy routes

---

## Troubleshooting

### Function Not Found (404)

- Verify function name matches deployment name
- Check function is deployed: `supabase functions list`
- Verify URL format: `/functions/v1/[function-name]`

### Unauthorized (401)

- Verify auth token is included in request
- Check token is valid and not expired
- Verify Edge Function has `verify_jwt = true` in config

### Webhook Signature Invalid (401)

- Verify `DODO_WEBHOOK_SECRET` matches DodoPayments dashboard
- Check webhook headers are included correctly
- Verify DodoPayments SDK version matches

### Database Errors

- Verify service role key has correct permissions
- Check RLS policies allow service role access
- Verify table names match schema

---

## Security Considerations

1. **Auth Tokens**: All Edge Functions (except webhook) verify Supabase JWT tokens
2. **Service Role Key**: Only used in Edge Functions, never exposed to client
3. **Webhook Verification**: DodoPayments webhook uses signature verification
4. **Idempotency**: Webhook events use `webhook-id` header for idempotency
5. **RLS Policies**: Database RLS policies ensure users can only access their own data

---

## Related Files

- `supabase/functions/` - All Edge Function implementations
- `src/services/api.ts` - Frontend API client
- `src/hooks/use*.ts` - React hooks for data fetching
- `src/context/AuthContext.tsx` - Updated to use Edge Functions
- `server.cjs` - Express server (TTS only)

---

## Next Steps

1. Deploy Edge Functions to Supabase
2. Update DodoPayments webhook URL
3. Test all endpoints
4. Migrate frontend components to use new hooks
5. Remove Express proxy routes (after full migration)

