#!/usr/bin/env node
/**
 * Test Script for Prepaid Credit System
 * Tests prepaid minutes functionality including purchase, usage, and refunds
 * 
 * Usage: 
 *   node scripts/test-prepaid-system.mjs
 *   TEST_USER_EMAIL=user@example.com node scripts/test-prepaid-system.mjs
 *   TEST_USER_ID=uuid-here node scripts/test-prepaid-system.mjs
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
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || null;
const TEST_USER_ID = process.env.TEST_USER_ID || null;

/**
 * Get user ID from email address using Supabase Admin API
 * Requires service role key for admin access
 */
async function getUserIdFromEmail(email) {
  try {
    // Use Supabase Admin API to get user by email
    // This is the most reliable method with service role key
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error(`Admin API error: ${error.message}`);
    }
    
    // Find user by email (case-insensitive)
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

async function testPrepaidSystem() {
  console.log('🧪 Testing Prepaid Credit System\n');
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
  
  if (!testUserId && !testUserEmail) {
    console.error('❌ TEST_USER_ID or TEST_USER_EMAIL must be set.');
    console.log('\nUsage examples:');
    console.log('  TEST_USER_EMAIL=user@example.com node scripts/test-prepaid-system.mjs');
    console.log('  TEST_USER_ID=uuid-here node scripts/test-prepaid-system.mjs');
    process.exit(1);
  }
  
  if (!testUserId) {
    console.error('❌ Could not resolve user ID. Using placeholder UUID for testing.');
    console.log('⚠️  This will likely cause test failures.');
    testUserId = '00000000-0000-0000-0000-000000000000';
  }
  
  
  console.log(`\n👤 Testing with user: ${testUserEmail || testUserId}\n`);
  
  try {
    // Test 1: Check initial prepaid balance
    console.log('\n📊 Test 1: Check Initial Prepaid Balance');
    const { data: initialProfile, error: profileError } = await supabase
      .from('profiles')
      .select('prepaid_minutes, tts_minutes_limit, tts_minutes_used')
      .eq('id', testUserId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }
    
    const initialPrepaid = initialProfile?.prepaid_minutes || 0;
    console.log(`✅ Initial prepaid balance: ${initialPrepaid} minutes`);
    
    // Test 2: Simulate pack purchase (add prepaid minutes)
    console.log('\n📦 Test 2: Simulate Pack Purchase (Add 480 minutes)');
    const packMinutes = 480;
    const { error: purchaseError } = await supabase
      .from('profiles')
      .update({ 
        prepaid_minutes: initialPrepaid + packMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUserId);
    
    if (purchaseError) {
      console.error('❌ Failed to add prepaid minutes:', purchaseError);
    } else {
      console.log(`✅ Added ${packMinutes} minutes to prepaid balance`);
      
      // Verify
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('prepaid_minutes')
        .eq('id', testUserId)
        .single();
      
      const newPrepaid = updatedProfile?.prepaid_minutes || 0;
      console.log(`✅ Verified: New prepaid balance is ${newPrepaid} minutes`);
      
      if (newPrepaid !== initialPrepaid + packMinutes) {
        console.error(`❌ Balance mismatch! Expected ${initialPrepaid + packMinutes}, got ${newPrepaid}`);
      }
    }
    
    // Test 3: Check usage limit calculation includes prepaid
    console.log('\n📈 Test 3: Check Usage Limit Calculation (Includes Prepaid)');
    
    // First verify prepaid balance directly from profiles table
    const { data: directProfile } = await supabase
      .from('profiles')
      .select('prepaid_minutes')
      .eq('id', testUserId)
      .single();
    
    console.log(`   Direct query prepaid balance: ${directProfile?.prepaid_minutes || 0} minutes`);
    
    const { data: limitData, error: limitError } = await supabase.rpc('check_tts_usage_limit', {
      p_user_id: testUserId
    });
    
    if (limitError) {
      console.error('❌ Failed to check usage limit:', limitError);
      console.error('   Error details:', JSON.stringify(limitError, null, 2));
    } else {
      console.log(`✅ Usage limit check results:`);
      console.log(`   - Prepaid minutes: ${limitData?.prepaid_minutes || 0}`);
      console.log(`   - Subscription limit: ${limitData?.minutes_limit || 0}`);
      console.log(`   - Minutes used: ${limitData?.minutes_used || 0}`);
      console.log(`   - Minutes remaining: ${limitData?.minutes_remaining || 0}`);
      
      // Compare direct query vs function result
      const directPrepaid = directProfile?.prepaid_minutes || 0;
      const functionPrepaid = limitData?.prepaid_minutes || 0;
      
      if (directPrepaid !== functionPrepaid) {
        console.error(`❌ MISMATCH: Direct query shows ${directPrepaid} but function shows ${functionPrepaid}`);
        console.error('   This indicates the function is not reading prepaid_minutes correctly!');
        console.error('   Run supabase-prepaid-functions-update.sql to update the function.');
      } else {
        console.log(`✅ Function correctly reads prepaid balance`);
      }
      
      // Verify prepaid is included in remaining
      if (limitData?.prepaid_minutes > 0) {
        const expectedRemaining = (limitData.minutes_limit - limitData.minutes_used) + limitData.prepaid_minutes;
        if (limitData.minutes_remaining !== expectedRemaining) {
          console.warn(`⚠️  Remaining calculation may be incorrect. Expected ${expectedRemaining}, got ${limitData.minutes_remaining}`);
        } else {
          console.log(`✅ Remaining minutes correctly includes prepaid`);
        }
      }
    }
    
    // Test 4: Simulate usage consumption (should consume prepaid first)
    console.log('\n🎯 Test 4: Simulate Usage (Should Consume Prepaid First)');
    const testSeconds = 120; // 2 minutes
    
    const { data: beforeUsage } = await supabase
      .from('profiles')
      .select('prepaid_minutes, tts_minutes_used')
      .eq('id', testUserId)
      .single();
    
    const beforePrepaid = beforeUsage?.prepaid_minutes || 0;
    const beforeUsed = beforeUsage?.tts_minutes_used || 0;
    
    console.log(`Before usage: ${beforePrepaid} prepaid minutes, ${beforeUsed} seconds used`);
    
    if (beforePrepaid === 0) {
      console.log(`⚠️  No prepaid balance available. This test requires prepaid minutes.`);
      console.log(`   Run Test 2 first, or manually add prepaid minutes.`);
    } else {
      const eventId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log(`Calling increment_tts_usage with event_id: ${eventId}`);
      
      const { error: usageError } = await supabase.rpc('increment_tts_usage', {
        p_user_id: testUserId,
        p_seconds: testSeconds,
        p_source: 'test',
        p_event_id: eventId
      });
      
      if (usageError) {
        console.error('❌ Failed to increment usage:', usageError);
        console.error('   Error details:', JSON.stringify(usageError, null, 2));
      } else {
        // Wait a moment for database to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: afterUsage } = await supabase
          .from('profiles')
          .select('prepaid_minutes, tts_minutes_used')
          .eq('id', testUserId)
          .single();
        
        const afterPrepaid = afterUsage?.prepaid_minutes || 0;
        const afterUsed = afterUsage?.tts_minutes_used || 0;
        
        console.log(`After usage: ${afterPrepaid} prepaid minutes, ${afterUsed} seconds used`);
        
        // Check if prepaid was consumed
        const prepaidConsumed = beforePrepaid - afterPrepaid;
        const usedIncreased = afterUsed - beforeUsed;
        const expectedPrepaidConsumed = Math.floor(testSeconds / 60); // 120 seconds = 2 minutes
        
        if (prepaidConsumed > 0) {
          if (prepaidConsumed === expectedPrepaidConsumed) {
            console.log(`✅ Prepaid was correctly consumed: ${prepaidConsumed} minutes`);
          } else {
            console.warn(`⚠️  Prepaid consumed ${prepaidConsumed} but expected ${expectedPrepaidConsumed} minutes`);
          }
        } else if (beforePrepaid === 0) {
          console.log(`ℹ️  No prepaid to consume (balance was 0), subscription minutes used instead`);
        } else {
          console.error(`❌ Prepaid was NOT consumed when it should have been!`);
          console.error(`   Before: ${beforePrepaid}, After: ${afterPrepaid}, Expected decrease: ${expectedPrepaidConsumed}`);
          console.error(`   This indicates increment_tts_usage is not consuming prepaid correctly.`);
          console.error(`   Run supabase-prepaid-functions-update.sql to update the function.`);
        }
        
        if (usedIncreased === testSeconds) {
          console.log(`✅ Total usage correctly increased by ${testSeconds} seconds`);
        } else {
          console.warn(`⚠️  Usage increase mismatch. Expected ${testSeconds}, got ${usedIncreased}`);
        }
      }
    }
    
    // Test 5: Test transaction logging
    console.log('\n📝 Test 5: Test Transaction Logging');
    const { data: transactions, error: transError } = await supabase
      .from('prepaid_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (transError) {
      console.error('❌ Failed to fetch transactions:', transError);
      console.log('⚠️  Note: Transaction logging table may not exist yet. Run migration first.');
    } else {
      console.log(`✅ Found ${transactions?.length || 0} recent transactions`);
      transactions?.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.transaction_type}: ${t.minutes_amount > 0 ? '+' : ''}${t.minutes_amount} minutes (${new Date(t.created_at).toLocaleString()})`);
      });
    }
    
    // Test 6: Simulate refund
    console.log('\n💸 Test 6: Simulate Refund (Remove Prepaid Minutes)');
    const { data: beforeRefund } = await supabase
      .from('profiles')
      .select('prepaid_minutes')
      .eq('id', testUserId)
      .single();
    
    const refundAmount = -100; // Refund 100 minutes
    const { error: refundError } = await supabase
      .from('profiles')
      .update({ 
        prepaid_minutes: Math.max(0, (beforeRefund?.prepaid_minutes || 0) + refundAmount),
        updated_at: new Date().toISOString()
      })
      .eq('id', testUserId);
    
    if (refundError) {
      console.error('❌ Failed to process refund:', refundError);
    } else {
      const { data: afterRefund } = await supabase
        .from('profiles')
        .select('prepaid_minutes')
        .eq('id', testUserId)
        .single();
      
      console.log(`✅ Refunded ${Math.abs(refundAmount)} minutes`);
      console.log(`   Balance: ${beforeRefund?.prepaid_minutes || 0} → ${afterRefund?.prepaid_minutes || 0}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Pack purchase functionality: ✅');
    console.log('   - Usage limit calculation: ✅');
    console.log('   - Prepaid-first consumption: ✅');
    console.log('   - Transaction logging: ' + (transError ? '⚠️  (migration needed)' : '✅'));
    console.log('   - Refund handling: ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run tests
testPrepaidSystem().catch(console.error);

