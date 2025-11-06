/**
 * Subscription Details Card Component
 * Shows current subscription information and management options
 */

import React from 'react';
import { Sparkles, Calendar, CreditCard } from 'lucide-react';
import { SubscriptionInfo } from '../../services/subscription/SubscriptionService';

interface SubscriptionDetailsCardProps {
  subscriptionInfo: SubscriptionInfo | null;
  onUpgradeClick?: () => void;
}

export const SubscriptionDetailsCard: React.FC<SubscriptionDetailsCardProps> = ({
  subscriptionInfo,
  onUpgradeClick,
}) => {

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  if (!subscriptionInfo) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">No subscription data available</div>
      </div>
    );
  }

  const subscription = subscriptionInfo.subscription;
  const product = subscriptionInfo.product;
  const profile = subscriptionInfo.profile;

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trial';
  const isFreeTier = !hasActiveSubscription && (profile.tts_minutes_limit ?? 0) > 0;
  const freePlanMinutes = profile.tts_minutes_limit ?? 60;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Subscription Details</h3>
        {!hasActiveSubscription && (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Free Tier
          </span>
        )}
      </div>

      {/* Current Plan */}
      <div className="mb-6">
        {hasActiveSubscription ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h4 className="text-xl font-bold text-gray-900">
                {product?.name || 'Premium Plan'}
              </h4>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {subscription?.status === 'trial' ? 'Trial' : 'Active'}
              </span>
            </div>
            {product?.description && (
              <p className="text-sm text-gray-600 mb-4">{product.description}</p>
            )}

            {/* Plan Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Included Minutes:</span>
                <span className="font-semibold text-gray-900">
                  {product?.tts_minutes_included?.toLocaleString() || 0} / month
                </span>
              </div>
              {product?.price_per_month && (
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold text-gray-900">
                    ${product.price_per_month.toFixed(2)} / month
                  </span>
                </div>
              )}
            </div>

            {/* Period Info */}
            {subscription?.current_period_start && subscription?.current_period_end && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-2">Billing Period</div>
                <div className="text-sm text-gray-900">
                  {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
                {subscription.cancel_at_period_end && (
                  <div className="mt-2 text-xs text-amber-700 font-medium">
                    Cancels at end of period
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isFreeTier ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xl font-bold text-gray-900">Free Plan</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">Perfect for getting started</p>
            <div className="flex items-center gap-3 text-sm mb-4">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Free Minutes:</span>
              <span className="font-semibold text-gray-900">
                {freePlanMinutes} / month
              </span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">No active subscription</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {!hasActiveSubscription && (
          <button
            onClick={handleUpgrade}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-colors font-medium shadow-md flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade Plan
          </button>
        )}
        {hasActiveSubscription && subscription?.status === 'active' && (
          <button
            onClick={handleUpgrade}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Manage Subscription
          </button>
        )}
      </div>
    </div>
  );
};

