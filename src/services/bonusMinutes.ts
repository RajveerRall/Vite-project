/**
 * Bonus Minutes Service
 * Helper functions for checking and granting bonus minutes
 */

import { getAnonymousSessionId } from '../utils/anonymousSession';

/**
 * Check if the current anonymous session has already answered the question
 */
export async function checkIfAnswered(): Promise<boolean> {
  try {
    const { supabase } = await import('../lib/supabase');
    const sessionId = getAnonymousSessionId();
    
    const { data, error } = await supabase
      .from('anonymous_tts_sessions')
      .select('has_answered_question')
      .eq('session_id', sessionId)
      .single();
    
    if (error || !data) return false;
    return data.has_answered_question || false;
  } catch (err) {
    console.warn('[BonusMinutes] Failed to check answer status:', err);
    return false;
  }
}

/**
 * Grant bonus minutes by answering the question
 * @param answer The user's answer to the question
 * @returns Success status and bonus information
 */
export async function grantBonusMinutes(answer: string): Promise<{
  success: boolean;
  error?: string;
  bonus_minutes?: number;
  bonus_seconds?: number;
  already_answered?: boolean;
}> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const sessionId = getAnonymousSessionId();
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      throw new Error('Supabase anon key not configured');
    }

    const functionsUrl = `${supabaseUrl}/functions/v1/grant-bonus-minutes`;

    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        answer: answer.trim()
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to grant bonus minutes',
        already_answered: data.already_answered || false
      };
    }

    return {
      success: true,
      bonus_minutes: data.bonus_minutes,
      bonus_seconds: data.bonus_seconds
    };
  } catch (err: any) {
    console.error('[BonusMinutes] Error granting bonus:', err);
    return {
      success: false,
      error: err.message || 'An error occurred while granting bonus minutes'
    };
  }
}

