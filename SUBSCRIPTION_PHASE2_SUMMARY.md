# Phase 2: Frontend Integration - Implementation Summary

## Overview

Phase 2 integrates the subscription system with the frontend, connecting usage limits, DodoPayments event ingestion, and UI components to provide a seamless user experience.

## What Was Implemented

### 1. DodoPayments Service (`src/services/subscription/DodoPaymentsService.ts`)

- **Purpose**: Send TTS usage events to DodoPayments for usage-based billing
- **Features**:
  - Sends events to `/events/ingest` API endpoint
  - Event format: `{ event_id, customer_id, event_name: 'tts.minute.used', metadata }`
  - Non-blocking (failures don't break TTS)
  - Singleton pattern for app-wide usage
  - Configurable via `VITE_DODO_API_KEY` and `VITE_DODO_BASE_URL`

### 2. Subscription Context (`src/context/SubscriptionContext.tsx`)

- **Purpose**: Centralized subscription state management
- **Features**:
  - Fetches subscription info from Supabase (`get_user_subscription_info`)
  - Tracks usage limits (`check_tts_usage_limit`)
  - Auto-refreshes on usage events
  - Provides computed values: `isSubscribed`, `isLimitExceeded`, `minutesRemaining`
  - Listens to `tts-usage-updated` events

### 3. Updated Usage Tracking

#### `useTTSUsage` Hook (`src/hooks/useTTSUsage.ts`)
- **Updated**: Now fetches real limits from `profiles.tts_minutes_limit`
- **Before**: Hardcoded `1000` minutes
- **After**: Dynamic limit based on subscription tier
- **Fallback**: Falls back to old method if limit check fails

#### `TTSUsageTracker` (`src/services/tts/TTSUsageTracker.ts`)
- **Added**: `checkUsageLimit()` - Validates limits before recording
- **Added**: `sendToDodoPayments()` - Sends events to DodoPayments (async, non-blocking)
- **Updated**: `trackUsageDirect()` - Checks limits and sends to DodoPayments
- **Error Handling**: Throws `TTS_USAGE_LIMIT_EXCEEDED` error when limit exceeded

#### `useReaderTTS` Hook (`src/hooks/useReaderTTS.ts`)
- **Updated**: `recordUsageSeconds()` - Handles limit exceeded errors
- **Features**:
  - Stops TTS playback when limit exceeded
  - Shows error toast
  - Dispatches `tts-limit-exceeded` event
  - Uses refs to avoid circular dependencies

### 4. UI Components

#### Subscription Limit Modal (`src/components/Subscription/SubscriptionLimitModal.tsx`)
- **Purpose**: Modal shown when user exceeds usage limit
- **Features**:
  - Shows current usage vs limit
  - Different messaging for free vs paid users
  - "Upgrade Plan" or "Subscribe Now" button
  - Styled with Tailwind CSS

#### Reader Component Integration (`src/components/Reader/index.tsx`)
- **Added**: Event listener for `tts-limit-exceeded`
- **Added**: Limit modal integration
- **Added**: Subscription context usage

### 5. App Integration (`src/App.tsx`)

- **Added**: `SubscriptionProvider` wrapper
- **Position**: Wrapped around `AppContent` to provide subscription context to all components

### 6. Environment Variables (`env.example`)

Added:
```bash
VITE_DODO_API_KEY=your-dodo-api-key
VITE_DODO_BASE_URL=https://test.dodopayments.com
```

## How It Works

### Flow Diagram

```
User Uses TTS
    ↓
useReaderTTS.recordUsageSeconds()
    ↓
TTSUsageTracker.recordUsageSeconds()
    ↓
TTSUsageTracker.checkUsageLimit() → Supabase RPC
    ↓
If limit exceeded → Stop TTS + Show Modal
If within limit:
    ↓
TTSUsageTracker.trackUsageDirect()
    ↓
1. Supabase increment_tts_usage() → Updates profiles.tts_minutes_used
2. DodoPayments.sendUsageEvent() → Sends to /events/ingest (async)
    ↓
Usage updated in both systems
```

### Limit Enforcement

1. **Before TTS starts**: `checkUsageLimit()` is called
2. **During usage tracking**: `increment_tts_usage` RPC checks limits
3. **If exceeded**: 
   - Error thrown with code `TTS_USAGE_LIMIT_EXCEEDED`
   - TTS playback stopped
   - Modal shown to user
   - Usage not recorded

### Header Integration

The existing header usage display (`Usage: X/Y min`) now automatically:
- Fetches real limits from subscription system
- Updates when limits change
- Shows actual subscription limits (not hardcoded 1000)

## DodoPayments Integration

### Event Format

```javascript
{
  event_id: "tts_1234567890_abc123",
  customer_id: "cus_abc123",  // From profiles.customer_id
  event_name: "tts.minute.used",
  metadata: {
    minutes: 1.5,
    source: "reader",
    timestamp: "2024-01-01T12:00:00Z"
  }
}
```

### Configuration

1. Set up meter in DodoPayments dashboard:
   - Event name: `tts.minute.used`
   - Aggregation: Sum (minutes)
   
2. Create product with usage pricing:
   - Link meter to product
   - Set price per minute
   - Set free threshold (e.g., 60 minutes free, then $0.01/minute)

3. Customer linking:
   - Store `customer_id` in `profiles.customer_id`
   - Link created when user subscribes (Phase 3)

## Testing

### Test Limit Enforcement

1. Set a test user's limit:
   ```sql
   UPDATE profiles 
   SET tts_minutes_limit = 5, tts_minutes_used = 0 
   WHERE id = 'user-id';
   ```

2. Use TTS for more than 5 minutes
3. Verify TTS stops and modal appears

### Test DodoPayments Events

1. Check browser console for `[DodoPayments] Usage event sent`
2. Verify in DodoPayments dashboard that events are received
3. Check meter aggregation is correct

### Test Header Display

1. Verify header shows correct limit (not 1000)
2. Check limit updates when subscription changes
3. Test refresh button updates usage

## Next Steps (Phase 3)

1. **DodoPayments Customer Creation**
   - Create customer in DodoPayments when user signs up
   - Store `customer_id` in `profiles.customer_id`

2. **Subscription Checkout Flow**
   - Create subscription management UI
   - Integrate DodoPayments checkout
   - Handle subscription creation/updates

3. **Webhook Handler Updates**
   - Update webhook handler for DodoPayments events (if they provide webhooks)
   - Sync subscription status from DodoPayments to Supabase

4. **Usage Display Enhancement**
   - Add progress bar to header
   - Show "Upgrade" button when near limit
   - Display next billing date

## Known Limitations

1. **DodoPayments Events**: Currently only sending events, not fetching usage from DodoPayments API (relying on Supabase for limits)
2. **Customer ID**: Not yet automatically created (requires Phase 3)
3. **Webhook Handler**: Still configured for Stripe, needs DodoPayments adaptation
4. **Subscription UI**: Upgrade flow not yet implemented (placeholder in modal)

## Files Created/Modified

### Created
- `src/services/subscription/DodoPaymentsService.ts`
- `src/context/SubscriptionContext.tsx`
- `src/components/Subscription/SubscriptionLimitModal.tsx`

### Modified
- `src/hooks/useTTSUsage.ts` - Fetch real limits
- `src/services/tts/TTSUsageTracker.ts` - Limit checking + DodoPayments
- `src/hooks/useReaderTTS.ts` - Limit error handling
- `src/components/Reader/index.tsx` - Limit modal integration
- `src/App.tsx` - SubscriptionProvider integration
- `env.example` - DodoPayments config

## Integration Status

✅ Database schema (Phase 1)  
✅ Limit checking in RPC functions  
✅ DodoPayments event ingestion  
✅ Subscription context  
✅ Usage display with real limits  
✅ Limit exceeded handling  
✅ UI modal for limit exceeded  
⏳ Subscription checkout (Phase 3)  
⏳ Customer creation automation (Phase 3)

Phase 2 is complete! The system now enforces usage limits and sends events to DodoPayments. The header automatically shows real subscription limits instead of hardcoded values.

