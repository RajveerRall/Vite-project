/**
 * Subscription Modal - Displays available subscription plans and allows users to subscribe
 */

import React, { useState } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionPlan, getOneTimePacks, getSubscriptionPlans } from '../../config/subscription-plans';
import { X, Settings, CreditCard, FileText, XCircle } from 'lucide-react';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { ChangePlanModal } from './ChangePlanModal';
import { BillingDetailsModal } from './BillingDetailsModal';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Get subscription info and hardcoded plans from context
  const {
    subscriptionInfo,
    plans,
    refreshSubscription,
    refreshUsageLimit,
    prepaidMinutes,
    usageLimit
  } = useSubscription();

  // Detect if user is on free tier
  const hasActiveSubscription = subscriptionInfo?.subscription?.status === 'active' ||
    subscriptionInfo?.subscription?.status === 'trial';
  const isFreeTierUser = !hasActiveSubscription &&
    (subscriptionInfo?.profile?.tts_minutes_limit ?? 0) > 0;
  const freePlanMinutes = subscriptionInfo?.profile?.tts_minutes_limit ?? 60;
  const freePlanMinutesUsed = Math.ceil((subscriptionInfo?.profile?.tts_minutes_used ?? 0) / 60);

  const { user } = useAuth();
  const [subscribing, setSubscribing] = useState<string | null>(null); // Track which plan is being subscribed to
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  /**
   * Handle plan selection - TEST MODE: Directly updates Supabase for testing
   * TODO: Uncomment DodoPayments integration after testing
   */
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    console.log('[SubscriptionModal] handleSubscribe called for plan:', plan.id, plan.type);

    // Step 1: Validation & Authentication
    if (!user?.id || !user?.email) {
      alert('Please sign in to subscribe');
      return;
    }

    setSubscribing(plan.id);
    console.log('[SubscriptionModal] Step 1: Validation passed, setting subscribing state');

    try {
      // Validate plan has product ID
      if (!plan.dodoProductId) {
        alert('This plan is not configured. Please contact support.');
        setSubscribing(null);
        return;
      }

      // Get access token using safe method (avoids hanging on getSession())
      const { getAccessToken } = await import('../../lib/authToken');
      console.log('[SubscriptionModal] Step 3: Getting access token...');

      let accessToken: string;
      try {
        accessToken = await getAccessToken(5000); // 5 second timeout
        console.log('[SubscriptionModal] Step 4: Access token obtained');
      } catch (tokenError: any) {
        console.error('[SubscriptionModal] Failed to get access token:', tokenError);
        throw new Error('Not authenticated. Please sign in again.');
      }

      // Use Edge Function checkout endpoint to include metadata (IP, user agent, user_id)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const checkoutEndpoint = `${supabaseUrl}/functions/v1/subscriptions`;

      console.log('[SubscriptionModal] Step 5: Calling Edge Function checkout endpoint...');

      const response = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'checkout',
          product_cart: [{
            product_id: plan.dodoProductId,
            quantity: 1,
          }],
          return_url: `${window.location.origin}/account`,
        }),
      });

      console.log('[SubscriptionModal] Step 6: Checkout request sent, waiting for response...');

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Checkout failed: ${errorText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // Use errorText as-is if not JSON
        }
        throw new Error(errorMessage);
      }

      const checkoutData = await response.json();
      console.log('[SubscriptionModal] Step 7: Checkout response received:', checkoutData);

      const checkoutUrl = checkoutData.checkout_url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned from Edge Function');
      }

      console.log('[SubscriptionModal] Step 8: Checkout URL received, redirecting to checkout');
      console.log('[SubscriptionModal] Metadata (IP, user agent, user_id) included in checkout session');

      // Close modal before redirect
      setSubscribing(null);
      onClose();

      // Redirect to DodoPayments checkout
      // User will complete payment and be redirected back to return_url (/account)
      window.location.href = checkoutUrl;

    } catch (error: any) {
      console.error('[SubscriptionModal] ❌ Purchase failed with error:', error);
      console.error('[SubscriptionModal] Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });

      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Failed to process purchase. Please try again.';

      alert(`❌ Error: ${errorMessage}`);

    } finally {
      // Always clear subscribing state, even if error occurred
      console.log('[SubscriptionModal] Finally block: Ensuring subscribing state is cleared');
      setSubscribing(null);
    }
  };

  if (!isOpen) return null;

  const currentPlanMinutes = subscriptionInfo?.product?.tts_minutes_included || 0;

  // Render Free Plan Card Component
  const renderFreePlanCard = () => {
    if (!isFreeTierUser) return null;

    // Calculate hours
    const hours = Math.floor(freePlanMinutes / 60);

    return (
      <div className="relative border-2 border-blue-100 bg-blue-50/50 rounded-2xl p-6 max-w-sm w-full">
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
          Active Plan
        </div>

        {/* Plan Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
          Free Plan
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-4 text-center leading-relaxed">Perfect for checking out the platform</p>

        {/* Minutes Included */}
        <div className="my-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {hours}
            </span>
            <span className="text-xl font-semibold text-gray-500">hours</span>
          </div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-1">
            Monthly Reading Time
          </div>
        </div>

        {/* Price */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-baseline justify-center">
            <span className="text-lg font-medium text-gray-500 mr-1">$</span>
            <span className="text-3xl font-bold text-gray-900">0</span>
            <span className="text-gray-500 ml-1">/mo</span>
          </div>
        </div>

        {/* Current Plan Button */}
        <button
          disabled
          className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold text-sm cursor-default"
        >
          Currently Active
        </button>
      </div>
    );
  };

  // Render Plan Card Component
  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = subscriptionInfo?.subscription?.plan_id === plan.dodoProductId;
    const isSubscribing = subscribing === plan.id;
    const isOneTimePack = plan.type === 'one-time';

    // Calculate hours
    const hours = Math.floor(plan.minutes / 60);

    return (
      <div
        key={plan.id}
        className={`relative border-2 rounded-2xl p-6 max-w-sm w-full transition-all duration-200 ${isCurrentPlan
          ? 'border-amber-500 bg-amber-50 shadow-sm'
          : 'border-gray-200 hover:border-indigo-300 hover:shadow-md bg-white'
          }`}
      >
        {isCurrentPlan && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
            Active Plan
          </div>
        )}

        {/* Plan Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
          {plan.name}
        </h3>

        {/* Description */}
        {plan.description && (
          <p className="text-sm text-gray-500 mb-4 text-center leading-relaxed">{plan.description}</p>
        )}

        {/* Minutes Included */}
        <div className="my-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {hours}
            </span>
            <span className="text-xl font-semibold text-gray-500">hours</span>
          </div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-1">
            {plan.type === 'subscription'
              ? plan.minutes === 0 ? 'Unlimited Access' : 'Monthly Reading Time'
              : 'Does not expire'}
          </div>
        </div>

        {/* Price */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-baseline justify-center">
            <span className="text-lg font-medium text-gray-500 mr-1">$</span>
            <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
            {plan.type === 'subscription' && <span className="text-gray-500 ml-1">/mo</span>}
          </div>
        </div>

        {/* Subscribe Button */}
        {isCurrentPlan && !isOneTimePack ? (
          <button
            disabled
            className="w-full px-4 py-3 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm cursor-default"
          >
            Currently Active
          </button>
        ) : (
          <button
            onClick={() => handleSubscribe(plan)}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all transform active:scale-95 font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isSubscribing}
          >
            {isSubscribing ? 'Processing...' : (hasActiveSubscription && plan.type === 'subscription' ? 'Upgrade Plan' : 'Purchase')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {hasActiveSubscription ? 'Upgrade Your Plan' : 'Choose a Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8 space-y-8">

          {/* 1. Subscription Plans Section - SHOW FIRST */}
          {getSubscriptionPlans().length > 0 && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {hasActiveSubscription ? 'For Heavy Readers' : 'Choose Your Plan'}
                </h3>
                <p className="text-gray-500">Unlock your reading potential with AI narration</p>
              </div>
              <div className="flex justify-center">
                <div className="grid grid-cols-1 gap-4 max-w-md w-full justify-items-center">
                  {/* Free Plan Card - Always show first if user is on free tier */}
                  {renderFreePlanCard()}
                  {/* Subscription Plans */}
                  {getSubscriptionPlans().map(renderPlanCard)}
                </div>
              </div>
            </div>
          )}

          {/* 2. Add-ons Section */}
          {getOneTimePacks().length > 0 && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Refill Packs</h3>
                <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                  One-time purchases. Never expire. Use anytime.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="grid grid-cols-1 gap-4 max-w-md w-full justify-items-center">
                  {getOneTimePacks().map(renderPlanCard)}
                </div>
              </div>
            </div>
          )}

          {/* 3. Current Plan Info Banner - MOVED TO BOTTOM */}
          {hasActiveSubscription && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="space-y-4">
                {/* Plan Name */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-1">Current Active Plan</p>
                    <p className="text-lg font-bold text-gray-900">
                      {subscriptionInfo?.product?.name || 'Unknown'}
                    </p>
                  </div>
                  <span className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full font-bold">
                    ACTIVE
                  </span>
                </div>

                {/* Usage Breakdown */}
                <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Subscription Minutes */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-medium">Monthly Allowance</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {usageLimit && usageLimit.minutes_remaining !== null && prepaidMinutes > 0
                          ? Math.max(0, Math.floor((usageLimit.minutes_remaining - prepaidMinutes) / 60))
                          : Math.floor((usageLimit?.minutes_remaining ?? currentPlanMinutes) / 60)}
                        <span className="text-sm font-medium text-gray-400 ml-1">hrs</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {(usageLimit && usageLimit.minutes_remaining !== null && prepaidMinutes > 0
                          ? Math.max(0, usageLimit.minutes_remaining - prepaidMinutes)
                          : usageLimit?.minutes_remaining ?? currentPlanMinutes) % 60} mins remaining
                      </div>
                    </div>

                    {/* Prepaid Credits */}
                    {prepaidMinutes > 0 ? (
                      <div className="border-l border-gray-100 pl-4">
                        <div className="flex items-center gap-1 mb-1">
                          <div className="text-xs text-gray-500 font-medium">Extra Credits</div>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.floor(prepaidMinutes / 60)}
                          <span className="text-sm font-medium text-green-400 ml-1">hrs</span>
                        </div>
                        <div className="text-xs text-green-600/70">
                          {prepaidMinutes % 60} mins available
                        </div>
                      </div>
                    ) : (
                      <div className="border-l border-gray-100 pl-4 opacity-50">
                        <div className="text-xs text-gray-500 mb-1">Extra Credits</div>
                        <div className="text-2xl font-bold text-gray-300">0</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isFreeTierUser && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="space-y-4">
                {/* Plan Name */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">Current Active Plan</p>
                    <p className="text-lg font-bold text-gray-900">Free Tier</p>
                  </div>
                  <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-bold">
                    ACTIVE
                  </span>
                </div>

                {/* Usage Breakdown */}
                <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Free Minutes */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-medium">Free Allowance</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.floor(Math.max(0, freePlanMinutes - freePlanMinutesUsed) / 60)}
                        <span className="text-sm font-medium text-gray-400 ml-1">hrs</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.max(0, freePlanMinutes - freePlanMinutesUsed) % 60} mins remaining
                      </div>
                    </div>

                    {/* Prepaid Credits */}
                    {prepaidMinutes > 0 ? (
                      <div className="border-l border-gray-100 pl-4">
                        <div className="text-xs text-gray-500 mb-1 font-medium">Extra Credits</div>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.floor(prepaidMinutes / 60)}
                          <span className="text-sm font-medium text-green-400 ml-1">hrs</span>
                        </div>
                        <div className="text-xs text-green-600/70">
                          {prepaidMinutes % 60} mins available
                        </div>
                      </div>
                    ) : (
                      <div className="border-l border-gray-100 pl-4 opacity-50">
                        <div className="text-xs text-gray-500 mb-1">Extra Credits</div>
                        <div className="text-2xl font-bold text-gray-300">0</div>
                      </div>
                    )}
                  </div>

                  {/* Usage Progress Bar */}
                  {freePlanMinutesUsed > 0 && freePlanMinutes > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 font-medium">Usage</span>
                        <span className="text-xs font-bold text-gray-700">
                          {Math.round((freePlanMinutesUsed / freePlanMinutes) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (freePlanMinutesUsed / freePlanMinutes) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Manage Subscription Section - MOVED TO BOTTOM */}
          {hasActiveSubscription && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-4 px-1">Manage Account</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowChangePlanModal(true)}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Change Plan</div>
                    <div className="text-xs text-gray-500">Upgrade / Downgrade</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Cancel</div>
                    <div className="text-xs text-gray-500">Stop Subscription</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowBillingModal(true)}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Invoices</div>
                    <div className="text-xs text-gray-500">Billing History</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Management Modals */}
      <ChangePlanModal
        isOpen={showChangePlanModal}
        onClose={() => setShowChangePlanModal(false)}
        onSuccess={() => {
          refreshSubscription();
          refreshUsageLimit();
        }}
      />

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={() => {
          refreshSubscription();
          refreshUsageLimit();
        }}
      />

      <BillingDetailsModal
        isOpen={showBillingModal}
        onClose={() => setShowBillingModal(false)}
      />
    </div>
  );
};

