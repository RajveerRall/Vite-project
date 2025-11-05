# Subscription System Phase 1 - Setup Guide

This document provides instructions for setting up Phase 1 of the subscription system.

## Database Setup

### 1. Run the SQL Schema

Execute the subscription-related SQL in `supabase-schema.sql` in your Supabase SQL Editor:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the subscription-related sections (starting from `-- === SUBSCRIPTION SYSTEM ===`)
4. Execute the SQL

### 2. Verify Tables Created

After running the SQL, verify these tables exist:
- `profiles` (with subscription-related columns)
- `subscriptions`
- `products`
- `prices`

### 3. Environment Variables

Add the following environment variables to your `.env` file or deployment configuration:

```bash
# Supabase (required for webhooks)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Payment Gateway Webhook Secret (e.g., Stripe)
WEBHOOK_SECRET=your_webhook_secret
# OR
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

**Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for webhook handlers to update subscription records. Never expose this in client-side code.

## Webhook Configuration

### 1. Configure Payment Gateway Webhook

Set up webhook endpoints in your payment gateway (e.g., Stripe):

- **Webhook URL**: `https://your-domain.com/api/subscription-webhook`
- **Events to listen for**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

### 2. Install Dependencies (if needed)

If using Stripe, install the Stripe package:

```bash
npm install stripe
```

Then update `server/subscription-webhooks.cjs` to implement proper signature verification.

## Testing the Setup

### 1. Test RPC Functions

Test the new RPC functions in Supabase SQL Editor:

```sql
-- Check usage limit
SELECT check_tts_usage_limit(auth.uid());

-- Get subscription info
SELECT get_user_subscription_info(auth.uid());

-- Get subscription status
SELECT get_subscription_status(auth.uid());

-- Calculate reset date
SELECT calculate_usage_reset_date(auth.uid());
```

### 2. Test Usage Limit Checking

The `increment_tts_usage` function now automatically:
- Checks if user has exceeded their limit
- Resets usage when subscription period renews
- Updates the `profiles.tts_minutes_used` column

### 3. Test Webhook Endpoint

Use a tool like `ngrok` to test webhooks locally, or send test events from your payment gateway dashboard.

## Default Free Tier

By default, new users have:
- `tts_minutes_limit`: 0 (unlimited) or you can set a default free tier limit
- `tts_minutes_used`: 0

To set a default free tier limit, update the profiles table:

```sql
-- Set default free tier to 60 minutes per month
UPDATE profiles
SET tts_minutes_limit = 60
WHERE subscription_id IS NULL
  AND tts_minutes_limit = 0;
```

Or modify the `check_tts_usage_limit` function to return a default limit for users without subscriptions.

## Next Steps

After Phase 1 is complete:
1. Phase 2: Frontend integration (subscription UI, usage display)
2. Phase 3: Payment gateway integration (Stripe checkout)
3. Phase 4: Testing and deployment

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is accessible
2. Verify webhook secret matches environment variable
3. Check server logs for errors
4. Verify Supabase credentials are correct

### Usage Limits Not Enforcing

1. Verify `profiles` table has correct `tts_minutes_limit` values
2. Check `increment_tts_usage` function is being called
3. Verify subscription status is 'active' or 'trial'
4. Check if `check_tts_usage_limit` is returning correct values

### Subscription Not Updating

1. Verify webhook events are being received
2. Check Supabase logs for RPC errors
3. Verify service role key has proper permissions
4. Check subscription table for correct `payment_gateway_subscription_id`
