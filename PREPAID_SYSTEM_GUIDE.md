# Prepaid Credit System Guide

## Overview

The prepaid credit system allows users to purchase minute packs separately from their subscription. Prepaid minutes are consumed first before subscription minutes, providing flexibility for users who need extra reading time.

## How It Works

### 1. Purchase Flow

1. User purchases a minute pack (one-time payment)
2. DodoPayments sends `payment.succeeded` webhook with `type: 'one-time'` metadata
3. Webhook handler (`handlePackPurchase`) adds minutes to `prepaid_minutes` column
4. Transaction is logged in `prepaid_transactions` table

### 2. Usage Consumption

When TTS usage is recorded:
1. `increment_tts_usage()` function checks prepaid balance first
2. Consumes from `prepaid_minutes` (converted to seconds)
3. Only consumes subscription minutes after prepaid is exhausted
4. Checks subscription limit only against subscription usage (not prepaid)

**Example**: User has 100 prepaid minutes and 1000 subscription minutes
- Usage of 50 minutes: Consumes 50 from prepaid, 0 from subscription
- Usage of 150 minutes: Consumes 100 from prepaid, 50 from subscription

### 3. Limit Calculation

The `check_tts_usage_limit()` function includes prepaid in remaining minutes:
```
minutes_remaining = (subscription_limit - subscription_used) + prepaid_minutes
```

### 4. Billing Integration

- Only subscription overage (beyond included minutes) is billed to DodoPayments
- Prepaid minutes are NOT billed (already paid for)
- Billing calculation: `billable = max(0, subscription_usage - included_minutes)`

## Database Schema

### Profiles Table
- `prepaid_minutes` (INTEGER): Current prepaid balance in minutes
- `tts_minutes_limit` (INTEGER): Subscription included minutes
- `tts_minutes_used` (INTEGER): Total usage in seconds

### Prepaid Transactions Table
Tracks all prepaid-related transactions:
- `purchase`: Adding minutes from pack purchase
- `refund`: Removing minutes from refund
- `expiration`: Removing expired minutes (if implemented)
- `usage`: Deducting minutes (optional, for detailed tracking)

## Webhook Events

### Pack Purchase
- **Event**: `payment.succeeded` with `metadata.type === 'one-time'`
- **Handler**: `handlePackPurchase()`
- **Action**: Increments `prepaid_minutes`, logs transaction

### Pack Refund
- **Event**: `refund.created`, `refund.succeeded`, or `payment.refunded`
- **Handler**: `handlePackRefund()`
- **Action**: Decrements `prepaid_minutes`, logs transaction

## Testing

Run the test script with either email or user ID:
```bash
# Using email address (recommended - easier to use)
TEST_USER_EMAIL=user@example.com node scripts/test-prepaid-system.mjs

# Or using user ID (UUID)
TEST_USER_ID=your-user-id node scripts/test-prepaid-system.mjs
```

**Note**: When using `TEST_USER_EMAIL`, the script will automatically look up the user ID using Supabase Admin API. Requires `SUPABASE_SERVICE_ROLE_KEY` (not anon key) for admin access.

Test scenarios:
1. Pack purchase adds to prepaid ✅
2. Usage consumes prepaid first ✅
3. Subscription renewal preserves prepaid ✅
4. Limit calculation includes prepaid ✅
5. Refund handling works correctly ✅

## Migration Steps

1. **Run prepaid minutes migration**:
   ```sql
   -- Run supabase-prepaid-minutes-migration.sql
   ```

2. **Run transactions table migration**:
   ```sql
   -- Run supabase-prepaid-transactions-migration.sql
   ```

3. **Update webhook handlers**:
   - Already updated in `server/subscription-webhooks.cjs`

4. **Update frontend**:
   - Already updated in subscription components

## UI Components

### SubscriptionModal
- Displays prepaid balance in current plan info
- Shows total available: subscription + prepaid
- Highlights prepaid credits in green

### SubscriptionLimitModal
- Shows prepaid balance when limit is reached
- Indicates if prepaid credits are still available

## Best Practices

1. **Always log transactions**: Use `log_prepaid_transaction()` RPC for audit trail
2. **Handle errors gracefully**: Transaction logging failures shouldn't break purchases
3. **Test refund flow**: Ensure refunds properly decrement prepaid balance
4. **Monitor balances**: Set up alerts for negative prepaid balances (shouldn't happen)

## Future Enhancements

- [ ] Expiration policy for prepaid minutes
- [ ] Admin dashboard to view/manage prepaid balances
- [ ] Usage breakdown by prepaid vs subscription
- [ ] Prepaid purchase history in user dashboard

