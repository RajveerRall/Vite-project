# Prepaid Minutes Consumption Debug

## Issue
Prepaid minutes are being consumed 10x faster than expected. 10 hours of prepaid minutes are being consumed in ~1 hour of actual usage.

## Logs Analysis
From user logs:
- Chunk 117: 7 seconds recorded → prepaid: 59 → 58 (1 minute consumed)
- Chunk 118: 2 seconds recorded → prepaid: 58 → 57 (1 minute consumed)  
- Chunk 119: 3 seconds recorded
- **Total recorded: 12 seconds**
- **Total prepaid consumed: 2 minutes (120 seconds)**
- **Ratio: 10x faster than expected**

## SQL Function Analysis

### `increment_tts_usage` Function (supabase-schema.sql)

**Prepaid Calculation (lines 1073-1081):**
```sql
v_prepaid_seconds := v_prepaid_minutes * 60;  -- Convert to seconds
v_prepaid_to_consume := LEAST(p_seconds, v_prepaid_seconds);  -- Consume from prepaid
v_prepaid_remaining := FLOOR((v_prepaid_seconds - v_prepaid_to_consume) / 60.0);  -- Convert back to minutes
```

**This calculation is CORRECT:**
- 59 minutes = 3540 seconds
- Consume 7 seconds
- Remaining = FLOOR((3540 - 7) / 60) = FLOOR(58.883) = 58 minutes ✓

### Potential Issues

1. **Unit Conversion Bug**: `p_seconds` might be in minutes instead of seconds
2. **Duplicate Recording**: Usage might be recorded multiple times per chunk
3. **Duration Calculation**: Frontend might be calculating duration incorrectly (e.g., in minutes or tenths of seconds)

## Added Logging

### Frontend Logs Added:
1. **TTSUsageTracker.ts** (line ~281):
   - Logs `seconds` value being sent
   - Logs full request body to `increment_tts_usage`
   - Logs successful response

2. **useReaderTTS.ts**:
   - **Seamless playback** (line ~847): Logs duration calculation for each chunk
   - **HTML5 playback** (line ~563): Logs duration calculation for each chunk
   - Both log: `durationsBufferValue`, `elapsed`, `calculatedSeconds`

## Next Steps

1. **Check browser console logs** to see:
   - What `seconds` values are being calculated
   - What `p_seconds` values are being sent to the API
   - If there are duplicate recordings

2. **Check Supabase function logs** to see:
   - What `p_seconds` values are being received
   - If the calculation is working as expected

3. **Verify duration sources**:
   - `X-Audio-Duration` header (should be in seconds)
   - `audioBuf.duration` (Web Audio API, should be in seconds)
   - `elapsed` time calculation (should be in seconds)

## Expected Values

For a typical chunk:
- **Duration**: 2-7 seconds
- **Prepaid consumption**: Should be 0.033-0.117 minutes (rounds down to 0 minutes, so 1 minute consumed per chunk is suspicious)

## Suspicious Pattern

The fact that **exactly 1 minute is consumed per chunk** (regardless of actual duration) suggests:
- Either `p_seconds` is being sent as `60` (1 minute) instead of the actual seconds
- Or there's a minimum consumption of 1 minute per chunk
- Or the duration is being calculated in minutes instead of seconds







