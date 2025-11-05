/**
 * Usage Stats Card Component
 * Displays usage statistics with subscription and prepaid breakdown
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SubscriptionInfo, UsageLimitInfo } from '../../services/subscription/SubscriptionService';

interface UsageStatsCardProps {
  subscriptionInfo: SubscriptionInfo | null;
  usageLimit: UsageLimitInfo | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const UsageStatsCard: React.FC<UsageStatsCardProps> = ({
  subscriptionInfo,
  usageLimit,
  onRefresh,
  refreshing = false,
}) => {
  const prepaidMinutes = usageLimit?.prepaid_minutes ?? 0;
  const minutesRemaining = usageLimit?.minutes_remaining ?? null;
  const isSubscribed = subscriptionInfo?.subscription?.status === 'active' || 
                       subscriptionInfo?.subscription?.status === 'trial';


  if (!usageLimit) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-gray-500 mb-2">No usage data available</div>
          <div className="text-xs text-gray-400 mb-4">
            The usage limit data could not be loaded. This might be a temporary issue.
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    );
  }

  const subscriptionMinutes = subscriptionInfo?.product?.tts_minutes_included || 0;
  const subscriptionMinutesUsed = Math.ceil((subscriptionInfo?.profile?.tts_minutes_used || 0) / 60);
  const subscriptionMinutesRemaining = Math.max(
    0,
    subscriptionMinutes - subscriptionMinutesUsed
  );

  const totalAvailable = minutesRemaining ?? 0;
  const totalUsed = subscriptionMinutesUsed;
  const totalLimit = subscriptionMinutes + prepaidMinutes;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            title="Refresh usage data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Total Available Minutes */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Total Available</span>
          <span className="text-2xl font-bold text-gray-900">{totalAvailable}</span>
        </div>
        <div className="text-xs text-gray-500 mb-2">minutes remaining</div>
        {totalLimit > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                totalAvailable / totalLimit > 0.5
                  ? 'bg-green-500'
                  : totalAvailable / totalLimit > 0.2
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (totalAvailable / totalLimit) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Subscription Minutes */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="text-xs text-gray-600 mb-1">Subscription</div>
          <div className="text-xl font-bold text-gray-900">
            {subscriptionMinutesRemaining}
          </div>
          <div className="text-xs text-gray-500">
            {subscriptionMinutes > 0 ? (
              `${subscriptionMinutesUsed} / ${subscriptionMinutes} used`
            ) : subscriptionMinutesUsed > 0 ? (
              `${subscriptionMinutesUsed} min used (Free tier)`
            ) : (
              'No subscription'
            )}
          </div>
          {subscriptionMinutes > 0 && (
            <div className="mt-2 w-full bg-amber-200 rounded-full h-1.5">
              <div
                className="bg-amber-600 h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (subscriptionMinutesUsed / subscriptionMinutes) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Prepaid Minutes */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-xs text-gray-600">Prepaid</div>
            {prepaidMinutes > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Bonus
              </span>
            )}
          </div>
          <div className="text-xl font-bold text-green-700">{prepaidMinutes}</div>
          <div className="text-xs text-gray-500">minutes available</div>
        </div>
      </div>

      {/* Info Text */}
      {prepaidMinutes > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            Prepaid credits are used first, then subscription minutes
          </p>
        </div>
      )}

      {/* Subscription Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Subscription Status</span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isSubscribed
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isSubscribed
              ? subscriptionInfo?.subscription?.status === 'trial'
                ? 'Trial'
                : 'Active'
              : 'Free Tier'}
          </span>
        </div>
        {subscriptionInfo?.subscription?.current_period_end && (
          <div className="mt-2 text-xs text-gray-500">
            Renews: {new Date(subscriptionInfo.subscription.current_period_end).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

