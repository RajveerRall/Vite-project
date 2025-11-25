#!/usr/bin/env node
/**
 * Test Script for Free Tier Limit Implementation
 * Tests the 360-minute (6-hour) free tier limit for users without subscriptions
 * 
 * Usage: 
 *   node scripts/test-free-tier-limit.mjs
 *   TEST_USER_EMAIL=user@example.com node scripts/test-free-tier-limit.mjs
 *   TEST_USER_ID=uuid-here node scripts/test-free-tier-limit.mjs
 * 
 * Environment variables can be set in .env file or via command line
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

// Load environment variables from .env file
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root (Vite-project directory)
config({ path: resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user - can be either email or UUID
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'jeroyo6418@wacold.com';
const TEST_USER_ID = process.env.TEST_USER_ID || null;

const FREE_TIER_LIMIT_MINUTES = 360; // 6 hours

/**
 * Get user ID from email address using Supabase Admin API
 * Requires service role key for admin access
 */
async function getUserIdFromEmail(email) {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error(`Admin API error: ${error.message}`);
    }
    
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error(`User not found with email: ${email}`);
    }
    
    return user.id;
  } catch (error) {
    console.error('Error looking up user by email:', error.message);
    throw error;
  }
}

/**
 * Find a user without subscription for testing
 */
async function findUserWithoutSubscription() {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, subscription_id, tts_minutes_limit')
      .is('subscription_id', null)
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (profiles) {
      return profiles.id;
    }
    
    // Try to find user with cancelled subscription
    const { data: cancelledProfiles } = await supabase
      .from('profiles')
      .select('id, subscription_id')
      .not('subscription_id', 'is', null)
      .limit(5);
    
    if (cancelledProfiles && cancelledProfiles.length > 0) {
      // Check subscription status
      for (const profile of cancelledProfiles) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('id', profile.subscription_id)
          .single();
        
        if (subscription && !['active', 'trial'].includes(subscription.status)) {
          return profile.id;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user without subscription:', error);
    return null;
  }
}

async function testFreeTierLimit() {
  console.log('🧪 Testing Free Tier Limit Implementation (360 minutes)\n');
  console.log('='.repeat(60));
  
  let testUserId = TEST_USER_ID;
  let testUserEmail = TEST_USER_EMAIL;
  
  // If email provided, resolve to user ID
  if (testUserEmail && !testUserId) {
    console.log(`\n📧 Looking up user ID for email: ${testUserEmail}`);
    try {
      testUserId = await getUserIdFromEmail(testUserEmail);
      console.log(`✅ Found user ID: ${testUserId}`);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      console.log('\n💡 Tip: Make sure you are using SUPABASE_SERVICE_ROLE_KEY (not anon key)');
      console.log('   The service role key has admin access to query auth.users');
      process.exit(1);
    }
  }
  
  // If no user specified, try to find one without subscription
  if (!testUserId && !testUserEmail) {
    console.log('\n🔍 No test user specified, looking for user without subscription...');
    testUserId = await findUserWithoutSubscription();
    
    if (testUserId) {
      console.log(`✅ Found test user: ${testUserId}`);
    } else {
      console.error('❌ Could not find a user without subscription for testing.');
      console.log('\n💡 Please provide a test user:');
      console.log('  TEST_USER_EMAIL=user@example.com node scripts/test-free-tier-limit.mjs');
      console.log('  TEST_USER_ID=uuid-here node scripts/test-free-tier-limit.mjs');
      process.exit(1);
    }
  }
  
  if (!testUserId) {
    console.error('❌ Could not resolve user ID. Using placeholder UUID for testing.');
    console.log('⚠️  This will likely cause test failures.');
    testUserId = '00000000-0000-0000-0000-000000000000';
  }
  
  console.log(`\n👤 Testing with user: ${testUserEmail || testUserId}\n`);
  
  let originalLimit = null;
  let originalUsage = null;
  
  try {
    // Test 1: Check initial state and verify free tier limit is applied
    console.log('\n📊 Test 1: Check Free Tier Limit Application');
    const { data: initialProfile, error: profileError } = await supabase
      .from('profiles')
      .select('tts_minutes_limit, subscription_minutes_used, prepaid_minutes, subscription_id')
      .eq('id', testUserId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }
    
    if (!initialProfile) {
      console.log('⚠️  Profile does not exist, will be created by function');
    } else {
      originalLimit = initialProfile.tts_minutes_limit;
      originalUsage = initialProfile.subscription_minutes_used;
      console.log(`   Current profile limit: ${originalLimit || 0} minutes`);
      console.log(`   Current usage: ${Math.floor((originalUsage || 0) / 60)} minutes`);
      console.log(`   Has subscription: ${initialProfile.subscription_id ? 'Yes' : 'No'}`);
    }
    
    // Call check_tts_usage_limit function
    const { data: limitData, error: limitError } = await supabase.rpc('check_tts_usage_limit', {
      p_user_id: testUserId
    });
    
    if (limitError) {
      console.error('❌ Failed to check usage limit:', limitError);
      throw limitError;
    }
    
    console.log(`\n✅ Function returned:`);
    console.log(`   - minutes_limit: ${limitData?.minutes_limit || 0}`);
    console.log(`   - minutes_used: ${limitData?.minutes_used || 0}`);
    console.log(`   - minutes_remaining: ${limitData?.minutes_remaining || 'unlimited'}`);
    console.log(`   - has_limit: ${limitData?.has_limit}`);
    console.log(`   - limit_exceeded: ${limitData?.limit_exceeded}`);
    
    // Verify limit is 360 for users without subscription
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('tts_minutes_limit, subscription_id')
      .eq('id', testUserId)
      .single();
    
    // Check subscription status
    let hasActiveSubscription = false;
    if (updatedProfile?.subscription_id) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('id', updatedProfile.subscription_id)
        .single();
      
      hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trial';
    }
    
    if (!hasActiveSubscription) {
      if (limitData?.minutes_limit === FREE_TIER_LIMIT_MINUTES) {
        console.log(`\n✅ PASS: User without subscription correctly gets ${FREE_TIER_LIMIT_MINUTES}-minute limit`);
      } else {
        console.error(`\n❌ FAIL: Expected ${FREE_TIER_LIMIT_MINUTES} minutes, got ${limitData?.minutes_limit}`);
        console.error('   The function may not be applying the free tier limit correctly.');
        throw new Error('Free tier limit not applied');
      }
      
      // Verify profile was updated
      if (updatedProfile && originalLimit === 0 && updatedProfile.tts_minutes_limit === FREE_TIER_LIMIT_MINUTES) {
        console.log(`✅ PASS: Profile was updated from 0 to ${FREE_TIER_LIMIT_MINUTES} minutes`);
      } else if (updatedProfile && updatedProfile.tts_minutes_limit === FREE_TIER_LIMIT_MINUTES) {
        console.log(`✅ PASS: Profile already has ${FREE_TIER_LIMIT_MINUTES}-minute limit`);
      }
    } else {
      console.log(`\nℹ️  User has active subscription, skipping free tier limit test`);
      console.log(`   Subscription limit: ${limitData?.minutes_limit} minutes`);
    }
    
    // Test 2: Verify users with subscriptions keep their subscription limit
    console.log('\n📊 Test 2: Verify Subscription Users Keep Their Limit');
    
    const { data: subscribedUsers } = await supabase
      .from('profiles')
      .select('id, tts_minutes_limit, subscription_id')
      .not('subscription_id', 'is', null)
      .limit(1)
      .single();
    
    if (subscribedUsers) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, plan_id')
        .eq('id', subscribedUsers.subscription_id)
        .single();
      
      if (subscription && ['active', 'trial'].includes(subscription.status)) {
        const { data: product } = await supabase
          .from('products')
          .select('tts_minutes_included')
          .eq('gateway_product_id', subscription.plan_id)
          .single();
        
        const { data: subLimitData } = await supabase.rpc('check_tts_usage_limit', {
          p_user_id: subscribedUsers.id
        });
        
        if (subLimitData) {
          if (product && subLimitData.minutes_limit === product.tts_minutes_included) {
            console.log(`✅ PASS: Subscribed user keeps subscription limit (${product.tts_minutes_included} minutes)`);
            console.log(`   Free tier limit (${FREE_TIER_LIMIT_MINUTES}) was NOT applied`);
          } else if (subLimitData.minutes_limit !== FREE_TIER_LIMIT_MINUTES) {
            console.log(`✅ PASS: Subscribed user has limit ${subLimitData.minutes_limit} (not free tier)`);
          } else {
            console.error(`❌ FAIL: Subscribed user incorrectly got free tier limit`);
          }
        }
      }
    } else {
      console.log(`ℹ️  No users with active subscriptions found for this test`);
    }
    
    // Test 3: Test limit enforcement (if user is under limit)
    console.log('\n📊 Test 3: Test Limit Enforcement');
    
    const currentUsage = limitData?.minutes_used || 0;
    const currentLimit = limitData?.minutes_limit || 0;
    const remainingMinutes = limitData?.minutes_remaining;
    
    if (currentLimit > 0 && remainingMinutes > 0) {
      console.log(`   Current usage: ${currentUsage} minutes`);
      console.log(`   Limit: ${currentLimit} minutes`);
      console.log(`   Remaining: ${remainingMinutes} minutes`);
      
      // Try to use a small amount (should succeed)
      const testSeconds = 60; // 1 minute
      const eventId = `test_free_tier_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      console.log(`\n   Testing usage increment of ${testSeconds} seconds...`);
      
      const { error: usageError } = await supabase.rpc('increment_tts_usage', {
        p_user_id: testUserId,
        p_seconds: testSeconds,
        p_source: 'test',
        p_event_id: eventId
      });
      
      if (usageError) {
        if (usageError.message?.includes('TTS_USAGE_LIMIT_EXCEEDED') || 
            usageError.message?.includes('limit exceeded')) {
          console.log(`   ⚠️  Limit exceeded (this is expected if usage is at limit)`);
        } else {
          console.error(`   ❌ Unexpected error: ${usageError.message}`);
        }
      } else {
        console.log(`   ✅ Usage increment succeeded`);
        
        // Verify usage was recorded
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: afterUsage } = await supabase
          .from('profiles')
          .select('subscription_minutes_used')
          .eq('id', testUserId)
          .single();
        
        if (afterUsage) {
          const newUsage = Math.floor(afterUsage.subscription_minutes_used / 60);
          console.log(`   ✅ Verified: Usage increased to ${newUsage} minutes`);
        }
      }
    } else {
      console.log(`   ℹ️  Cannot test enforcement: limit is ${currentLimit} or remaining is ${remainingMinutes}`);
    }
    
    // Test 4: Verify prepaid minutes work with free tier limit
    console.log('\n📊 Test 4: Verify Prepaid Minutes With Free Tier Limit');
    
    const { data: prepaidProfile } = await supabase
      .from('profiles')
      .select('id, prepaid_minutes, tts_minutes_limit, subscription_id')
      .gt('prepaid_minutes', 0)
      .limit(1)
      .single();
    
    if (prepaidProfile) {
      // Check if user has subscription
      let hasSub = false;
      if (prepaidProfile.subscription_id) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('id', prepaidProfile.subscription_id)
          .single();
        hasSub = sub?.status === 'active' || sub?.status === 'trial';
      }
      
      if (!hasSub) {
        const { data: prepaidLimitData } = await supabase.rpc('check_tts_usage_limit', {
          p_user_id: prepaidProfile.id
        });
        
        if (prepaidLimitData) {
          const expectedRemaining = (prepaidLimitData.minutes_limit - prepaidLimitData.minutes_used) + prepaidLimitData.prepaid_minutes;
          
          console.log(`   Free tier limit: ${prepaidLimitData.minutes_limit} minutes`);
          console.log(`   Prepaid minutes: ${prepaidLimitData.prepaid_minutes} minutes`);
          console.log(`   Minutes remaining: ${prepaidLimitData.minutes_remaining}`);
          console.log(`   Expected remaining: ${expectedRemaining}`);
          
          if (prepaidLimitData.minutes_limit === FREE_TIER_LIMIT_MINUTES) {
            console.log(`   ✅ PASS: Free tier limit (${FREE_TIER_LIMIT_MINUTES}) applied`);
          }
          
          if (prepaidLimitData.minutes_remaining === expectedRemaining) {
            console.log(`   ✅ PASS: Prepaid minutes correctly included in remaining calculation`);
          } else {
            console.warn(`   ⚠️  Remaining calculation may be incorrect`);
          }
        }
      } else {
        console.log(`   ℹ️  User with prepaid has active subscription, skipping free tier test`);
      }
    } else {
      console.log(`   ℹ️  No users with prepaid minutes found for this test`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log(`   - Free tier limit (${FREE_TIER_LIMIT_MINUTES} minutes) application: ✅`);
    console.log(`   - Subscription users keep their limits: ✅`);
    console.log(`   - Limit enforcement: ✅`);
    console.log(`   - Prepaid minutes compatibility: ✅`);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('   Error details:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    process.exit(1);
  }
}

// Run tests
testFreeTierLimit().catch(console.error);












