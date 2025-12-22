import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // Assuming you have a supabase client
import { useAuth } from '../context/AuthContext'; // To get userId if available
import { trackEvent } from '../lib/analytics'; // For analytics

export function useAppBetaForm() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitBetaForm = useCallback(async (email: string, reason: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('beta_signups') // Make sure this table exists in your Supabase schema
        .insert([
          {
            email: email,
            reason: reason,
            user_id: user?.id || null, // Associate with logged-in user if available
            signup_date: new Date().toISOString(),
          },
        ]);

      if (dbError) {
        console.error('[AppBetaForm] Supabase submission error:', dbError);
        throw new Error(dbError.message || 'Failed to submit form.');
      }

      setIsSuccess(true);
      trackEvent('app_beta_signup', {
        user_id: user?.id,
        email: email,
        platform: 'android',
        timestamp: new Date().toISOString(),
      });
      console.log('[AppBetaForm] Form submitted successfully:', data);

      // Optionally, trigger a function to grant listening hours here if automated
      // await supabase.rpc('grant_listening_hours', { p_user_id: user?.id, p_hours: 10 });

    } catch (err: any) {
      console.error('[AppBetaForm] Submission failed:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { submitBetaForm, isLoading, isSuccess, error, setIsSuccess }; // Expose setIsSuccess to reset form state
}