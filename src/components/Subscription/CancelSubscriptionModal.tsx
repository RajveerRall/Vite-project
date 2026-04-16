/**
 * Cancel Subscription Modal
 * Confirmation dialog for canceling subscription
 */

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import { cancelSubscription } from '../../services/subscription/SubscriptionService';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { subscriptionInfo, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscription = subscriptionInfo?.subscription;
  const currentPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const handleCancel = async () => {
    if (!user?.id || !subscription?.payment_gateway_subscription_id) {
      setError('Missing subscription information');
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      const result = await cancelSubscription(user.id, subscription.payment_gateway_subscription_id);
      
      if (result.success) {
        // Refresh subscription data
        await refreshSubscription();
        
        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
        
        // Close modal
        onClose();
      } else {
        setError(result.error || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      console.error('[CancelSubscriptionModal] Error:', err);
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Cancel Subscription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={cancelling}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are you sure you want to cancel?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Your subscription will remain active until the end of your current billing period.
              </p>
              {currentPeriodEnd && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Your access will continue until:</strong>
                  </p>
                  <p className="text-base font-semibold text-amber-900 mt-1">
                    {currentPeriodEnd}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    You'll continue to have access to all features until this date. After cancellation, 
                    you'll move to the free tier.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={cancelling}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Subscription
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

