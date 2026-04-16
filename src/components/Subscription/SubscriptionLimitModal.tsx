/**
 * Subscription Limit Modal - Shown when user exceeds TTS usage limit
 * Prompts user to upgrade subscription
 */

import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';

interface SubscriptionLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export const SubscriptionLimitModal: React.FC<SubscriptionLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
}) => {
  const { usageLimit, subscriptionInfo, prepaidMinutes } = useSubscription();

  if (!isOpen) return null;

  const minutesUsed = usageLimit?.minutes_used || 0;
  const minutesLimit = usageLimit?.minutes_limit || 0;
  const minutesRemaining = usageLimit?.minutes_remaining || 0;
  const hasSubscription = subscriptionInfo?.subscription?.status === 'active' || subscriptionInfo?.subscription?.status === 'trial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {hasSubscription ? 'Usage Limit Reached' : 'Free Limit Reached'}
        </h2>

        {/* Message */}
        <div className="text-center text-gray-600 mb-6 space-y-2">
          {hasSubscription ? (
            <>
              <p>
                You've used <span className="font-semibold text-gray-900">{minutesUsed} out of {minutesLimit} minutes</span> this billing period.
              </p>
              {prepaidMinutes > 0 && minutesRemaining > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  <span className="text-gray-600">You still have </span>
                  <span className="font-semibold">{prepaidMinutes} prepaid credits</span>
                  <span className="text-gray-600"> available ({minutesRemaining} total minutes remaining).</span>
                </p>
              )}
              {minutesRemaining <= 0 && (
                <p className="text-sm mt-2 block text-gray-500">Upgrade your plan for more minutes.</p>
              )}
            </>
          ) : (
            <>
              <p>
                You've used <span className="font-semibold text-gray-900">{minutesUsed} out of {minutesLimit} free minutes</span> this month.
              </p>
              {prepaidMinutes > 0 && minutesRemaining > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  <span className="text-gray-600">You still have </span>
                  <span className="font-semibold">{prepaidMinutes} prepaid credits</span>
                  <span className="text-gray-600"> available ({minutesRemaining} total minutes remaining).</span>
                </p>
              )}
            </>
          )}
        </div>

        {/* Benefits List */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            {hasSubscription ? 'Upgrade to get:' : 'Subscribe to get:'}
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>More TTS minutes</strong> per month</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>Access to Picture Mode</strong> audiobook feature</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>Priority support</strong> and updates</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              if (onUpgrade) {
                onUpgrade();
              } else {
                // Default action: could open subscription page or modal
                console.log('[Subscription] Upgrade clicked - implement subscription flow');
              }
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium shadow-md"
          >
            {hasSubscription ? 'Upgrade Plan' : 'Subscribe Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

