import React, { useState, useEffect } from 'react';
import { getAnonymousSessionId } from '../utils/anonymousSession';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  showQuestionDirectly?: boolean; // Option to show question form directly
}

export const UsageLimitModal: React.FC<UsageLimitModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  showQuestionDirectly = false
}) => {
  const [showQuestion, setShowQuestion] = useState(showQuestionDirectly);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Check if user has already answered when modal opens
  useEffect(() => {
    if (isOpen && !showQuestion) {
      checkIfAnswered();
    }
  }, [isOpen, showQuestion]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setShowQuestion(showQuestionDirectly);
      if (!showQuestionDirectly) {
        setAnswer('');
        setError(null);
        setSuccess(false);
      }
    } else {
      setShowQuestion(false);
      setAnswer('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, showQuestionDirectly]);

  const checkIfAnswered = async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      const sessionId = getAnonymousSessionId();

      // Use RPC function which has SECURITY DEFINER and can read the data
      const { data, error: fetchError } = await supabase.rpc('get_anonymous_usage', {
        p_session_id: sessionId
      });

      if (!fetchError && data?.has_bonus) {
        setHasAnswered(true);
      }
    } catch (err) {
      // Silently fail - don't block UI
      console.warn('[UsageLimitModal] Failed to check answer status:', err);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const sessionId = getAnonymousSessionId();
      const functionsUrl = `${supabaseUrl}/functions/v1/grant-bonus-minutes`;

      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not configured');
      }

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
        if (data.already_answered) {
          setError('You have already answered this question');
          setHasAnswered(true);
        } else {
          setError(data.error || 'Failed to grant bonus minutes. Please try again.');
        }
        return;
      }

      // Success!
      setSuccess(true);
      setHasAnswered(true);

      // Refresh usage limit
      window.dispatchEvent(new CustomEvent('tts-usage-updated', {
        detail: { isAnonymous: true }
      }));

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setShowQuestion(false);
        setAnswer('');
        setSuccess(false);
        setError(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting answer:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Question form view
  if (showQuestion) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6 max-h-[90vh] overflow-y-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
              <p className="text-gray-600 mb-4">
                You've received 1 hour of free listening time!
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Get 1 Hour Free!
              </h2>
              <p className="text-gray-600 mb-6">
                Answer this question to get 1 hour of free listening time:
              </p>

              <form onSubmit={handleAnswerSubmit} className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you want to listen to your ebooks?
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm min-h-[100px]"
                  rows={4}
                  required
                  disabled={isSubmitting}
                  minLength={10}
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-gray-500 mb-2">
                  Minimum 10 characters
                </p>

                {error && (
                  <p className="mt-2 mb-2 text-sm text-red-600">{error}</p>
                )}

                <div className="flex gap-3 mt-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuestion(false);
                      setAnswer('');
                      setError(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || !answer.trim() || answer.trim().length < 10}
                  >
                    {isSubmitting ? 'Submitting...' : 'Get 1 Hour Free'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // Main modal view
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-6 text-center max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-900 mb-6 text-base sm:text-lg">
          Free minutes used. Get more time by answering a question or sign up to continue reading.
        </p>

        <div className="space-y-3">
          {!hasAnswered && (
            <button
              onClick={() => setShowQuestion(true)}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-medium shadow-md text-base"
            >
              Answer Question (Get 1 Hour Free)
            </button>
          )}

          <button
            onClick={onSignIn}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium shadow-md text-base"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};
