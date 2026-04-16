# Supabase Migration Instructions: Subscription Minutes Tracking

## Overview

This migration adds separate tracking for subscription minutes usage (`subscription_minutes_used`) to enable independent reset logic from prepaid minutes.

## Migration File

`supabase-add-subscription-minutes-used.sql`

## What This Migration Does

1. **Adds `subscription_minutes_used` column** to `profiles` table
   - Tracks subscription usage separately from prepaid minutes
   - Stored in seconds (despite the name)

2. **Updates `check_tts_usage_limit()` function**
   - Uses `subscription_minutes_used` for limit checks
   - Returns `subscription_minutes_used` in response for frontend compatibility

3. **Updates `reset_user_tts_usage()` function**
   - Resets only `subscription_minutes_used` and `tts_minutes_used`
   - Keeps `prepaid_minutes` unchanged (never resets)

4. **Updates `increment_tts_usage()` function**
   - Consumes prepaid minutes first
   - Tracks subscription usage separately after prepaid is exhausted
   - Updates all three fields atomically:
     - `prepaid_minutes` (decreases)
     - `subscription_minutes_used` (increases in seconds)
     - `tts_minutes_used` (total tracking in seconds)

## How to Apply Migration

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy Migration SQL

1. Open `supabase-add-subscription-minutes-used.sql` from your project
2. Copy the entire contents of the file
3. Paste into the SQL Editor

### Step 3: Execute Migration

1. Review the SQL to ensure it's correct
2. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
3. Wait for execution to complete

### Step 4: Verify Migration Success

Run these verification queries in the SQL Editor:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'subscription_minutes_used';

-- Check function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'increment_tts_usage';

-- Test with a sample user (replace with your user ID)
SELECT 
  id,
  subscription_minutes_used,
  prepaid_minutes,
  tts_minutes_used
FROM profiles 
LIMIT 5;
```

Expected results:
- Column `subscription_minutes_used` should exist with type `integer` and default `0`
- Function `increment_tts_usage` should include logic for `subscription_minutes_used`
- All profiles should have `subscription_minutes_used = 0` initially

## Post-Migration Testing

After applying the migration, test the following:

1. **TTS Usage Tracking**
   - Use TTS feature in your app
   - Check that `prepaid_minutes` decreases when you have prepaid balance
   - Check that `subscription_minutes_used` increases only after prepaid is exhausted
   - Verify `tts_minutes_used` increments for total tracking

2. **Frontend Display**
   - Check usage stats display correctly
   - Verify prepaid minutes decrease
   - Verify subscription usage shows correctly

3. **Reset Functionality**
   - If subscription period ends, verify only `subscription_minutes_used` resets
   - Verify `prepaid_minutes` remains unchanged after reset

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove the column (will lose data!)
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_minutes_used;

-- Restore old function versions (you'll need previous versions)
-- Note: This is not provided here as it depends on your previous state
```

**Warning**: Rolling back will lose subscription minutes tracking data. Make sure you have backups before rolling back.

## Troubleshooting

### Error: "column already exists"
- The column already exists, which is fine - the migration uses `IF NOT EXISTS`
- You can safely run the migration again

### Error: "function does not exist"
- This shouldn't happen if you're running the full migration
- Make sure you copied the entire migration file

### Usage not updating after migration
- Verify the migration ran successfully
- Check that `increment_tts_usage()` function was updated correctly
- Check browser console for errors
- Verify user has proper RLS permissions

### Prepaid minutes not decreasing
- Check that `increment_tts_usage()` function includes prepaid consumption logic
- Verify the UPDATE statement updates `prepaid_minutes` field
- Check for any errors in Supabase logs

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify RLS policies allow the function to update profiles
3. Ensure `SECURITY DEFINER` is set on functions (allows bypassing RLS)
4. Check that user has proper authentication token

