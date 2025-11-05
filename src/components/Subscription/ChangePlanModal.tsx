/**
 * Change Plan Modal
 * Allows users to upgrade or downgrade their subscription plan
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import { changeSubscriptionPlan } from '../../services/subscription/SubscriptionService';
import { getSubscriptionPlans, SubscriptionPlan } from '../../config/subscription-plans';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { subscriptionInfo, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscription = subscriptionInfo?.subscription;
  const currentPlanId = subscription?.plan_id;
  const subscriptionPlans = getSubscriptionPlans();
  
  // Filter out current plan
  const availablePlans = subscriptionPlans.filter(
    plan => plan.dodoProductId !== currentPlanId
  );

  const handleChangePlan = async (plan: SubscriptionPlan) => {
    if (!user?.id || !subscription?.payment_gateway_subscription_id || !plan.dodoProductId) {
      setError('Missing subscription or plan information');
      return;
    }

    setChanging(plan.id);
    setError(null);

    try {
      const result = await changeSubscriptionPlan(
        user.id,
        subscription.payment_gateway_subscription_id,
        plan.dodoProductId
      );
      
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
        setError(result.error || 'Failed to change plan');
      }
    } catch (err: any) {
      console.error('[ChangePlanModal] Error:', err);
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setChanging(null);
    }
  };

  if (!isOpen) return null;

  const currentPlan = subscriptionPlans.find(plan => plan.dodoProductId === currentPlanId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Change Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={changing !== null}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Plan */}
          {currentPlan && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Plan</p>
                  <p className="text-lg font-bold text-gray-900">{currentPlan.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    ${currentPlan.price.toFixed(2)}/month • {currentPlan.minutes.toLocaleString()} minutes/month
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded-full">
                  Active
                </span>
              </div>
            </div>
          )}

          {/* Available Plans */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>
            {availablePlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No other plans available at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePlans.map((plan) => {
                  const isChanging = changing === plan.id;
                  const isUpgrade = plan.minutes > (currentPlan?.minutes || 0);
                  
                  return (
                    <div
                      key={plan.id}
                      className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                    >
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                      
                      {plan.description && (
                        <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                      )}

                      <div className="mb-4">
                        <div className="text-3xl font-bold text-gray-900">
                          {plan.minutes.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">minutes/month</div>
                      </div>

                      <div className="mb-4">
                        <div className="text-2xl font-bold text-gray-900">
                          ${plan.price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">per month</div>
                      </div>

                      {/* Plan Comparison */}
                      {currentPlan && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">
                            {isUpgrade ? 'Upgrade' : 'Downgrade'} from {currentPlan.name}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {isUpgrade ? '+' : ''}
                            {(plan.minutes - currentPlan.minutes).toLocaleString()} minutes
                            {' • '}
                            {isUpgrade ? '+' : ''}${(plan.price - currentPlan.price).toFixed(2)}/month
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => handleChangePlan(plan)}
                        disabled={isChanging}
                        className={`w-full px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isUpgrade
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {isChanging ? 'Changing...' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Info Note */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Plan changes take effect immediately with prorated billing. 
              You'll be charged or credited the difference for the remainder of your billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

