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

    return (
      <div className="border-2 border-amber-500 bg-amber-50 rounded-lg p-6 max-w-sm">
        {/* Current Plan Badge */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900">Free</h3>
          <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">Perfect for getting started</p>

        {/* Minutes Included */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900">
            {freePlanMinutes}
          </div>
          <div className="text-sm text-gray-600">minutes/month</div>
        </div>

        {/* Usage Info */}
        <div className="mb-4 p-3 bg-white rounded-lg border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-600">Current Usage</div>
            {usageLimit && usageLimit.minutes_remaining !== null && prepaidMinutes > 0 && (
              <span className="text-xs font-medium text-green-600">
                {usageLimit.minutes_remaining} total available
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-gray-900 mb-2">
            {freePlanMinutesUsed} / {freePlanMinutes} minutes used
          </div>
          {prepaidMinutes > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded border border-green-200">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Prepaid
              </span>
              <span className="text-xs text-gray-700">
                <span className="font-semibold text-green-700">{prepaidMinutes} minutes</span> available
              </span>
            </div>
          )}
          {freePlanMinutesUsed > 0 && freePlanMinutes > 0 && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (freePlanMinutesUsed / freePlanMinutes) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">Free</div>
          <div className="text-sm text-gray-600">$0/month</div>
        </div>

        {/* Current Plan Button */}
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed font-medium"
        >
          Current Plan
        </button>
      </div>
    );
  };

  // Render Plan Card Component
  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = subscriptionInfo?.subscription?.plan_id === plan.dodoProductId;
    const isSubscribing = subscribing === plan.id;
    const isOneTimePack = plan.type === 'one-time';

    return (
      <div
        key={plan.id}
        className={`border-2 rounded-lg p-6 max-w-sm ${
          isCurrentPlan
            ? 'border-amber-500 bg-amber-50'
            : 'border-gray-200 hover:border-amber-300 transition-colors'
        }`}
      >
        {/* Plan Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {plan.name}
        </h3>

        {/* Description */}
        {plan.description && (
          <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
        )}

        {/* Minutes Included */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900">
            {plan.minutes === 0 ? '∞' : plan.minutes.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            {plan.type === 'subscription' 
              ? plan.minutes === 0 ? 'Unlimited' : 'minutes/month'
              : 'minutes (one-time)'}
          </div>
        </div>

        {/* Price */}
          <div className="mb-4">
            <div className="text-2xl font-bold text-gray-900">
            ${plan.price.toFixed(2)}
            </div>
          <div className="text-sm text-gray-600">
            {plan.type === 'subscription' ? 'per month' : 'one-time payment'}
          </div>
        </div>

        {/* Subscribe Button */}
        {isCurrentPlan && !isOneTimePack ? (
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed font-medium"
          >
            Current Plan
          </button>
        ) : (
          <button
            onClick={() => handleSubscribe(plan)}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubscribing}
          >
            {isSubscribing ? 'Processing...' : (hasActiveSubscription && plan.type === 'subscription' ? 'Upgrade' : 'Purchase')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
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
        <div className="p-6 lg:p-8">
          {/* Current Plan Info Banner */}
          {hasActiveSubscription && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="space-y-3">
                {/* Plan Name */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    Current Plan: {subscriptionInfo?.product?.name || 'Unknown'}
                  </p>
                  <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded-full font-medium">
                    Active
                  </span>
                </div>
                
                {/* Usage Breakdown */}
                <div className="bg-white rounded-md p-3 border border-amber-100">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Subscription Minutes */}
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Subscription</div>
                      <div className="text-lg font-bold text-gray-900">
                        {usageLimit && usageLimit.minutes_remaining !== null && prepaidMinutes > 0
                          ? Math.max(0, usageLimit.minutes_remaining - prepaidMinutes)
                          : usageLimit?.minutes_remaining ?? currentPlanMinutes}
                      </div>
                      <div className="text-xs text-gray-500">minutes remaining</div>
                    </div>
                    
                    {/* Prepaid Credits */}
                    {prepaidMinutes > 0 ? (
                      <div className="border-l border-gray-200 pl-3">
                        <div className="flex items-center gap-1 mb-1">
                          <div className="text-xs text-gray-600">Prepaid Credits</div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Bonus
                          </span>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {prepaidMinutes}
                        </div>
                        <div className="text-xs text-gray-500">minutes available</div>
                      </div>
                    ) : (
                      <div className="border-l border-gray-200 pl-3">
                        <div className="text-xs text-gray-600 mb-1">Prepaid Credits</div>
                        <div className="text-lg font-bold text-gray-400">0</div>
                        <div className="text-xs text-gray-500">No prepaid credits</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Total Available */}
                  {usageLimit && usageLimit.minutes_remaining !== null && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Available:</span>
                        <span className="text-lg font-bold text-amber-700">
                          {usageLimit.minutes_remaining} minutes
                        </span>
                      </div>
                      {prepaidMinutes > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Prepaid credits are used first, then subscription minutes
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isFreeTierUser && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-3">
                {/* Plan Name */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    Current Plan: Free Plan
                  </p>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">
                    Free Tier
                  </span>
                </div>
                
                {/* Usage Breakdown */}
                <div className="bg-white rounded-md p-3 border border-blue-100">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Free Minutes */}
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Free Minutes</div>
                      <div className="text-lg font-bold text-gray-900">
                        {usageLimit && usageLimit.minutes_remaining !== null && prepaidMinutes > 0
                          ? Math.max(0, usageLimit.minutes_remaining - prepaidMinutes)
                          : Math.max(0, freePlanMinutes - freePlanMinutesUsed)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {freePlanMinutesUsed} / {freePlanMinutes} used
                      </div>
                    </div>
                    
                    {/* Prepaid Credits */}
                    {prepaidMinutes > 0 ? (
                      <div className="border-l border-gray-200 pl-3">
                        <div className="flex items-center gap-1 mb-1">
                          <div className="text-xs text-gray-600">Prepaid Credits</div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Bonus
                          </span>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {prepaidMinutes}
                        </div>
                        <div className="text-xs text-gray-500">minutes available</div>
                      </div>
                    ) : (
                      <div className="border-l border-gray-200 pl-3">
                        <div className="text-xs text-gray-600 mb-1">Prepaid Credits</div>
                        <div className="text-lg font-bold text-gray-400">0</div>
                        <div className="text-xs text-gray-500">No prepaid credits</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Total Available */}
                  {usageLimit && usageLimit.minutes_remaining !== null && prepaidMinutes > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Available:</span>
                        <span className="text-lg font-bold text-blue-700">
                          {usageLimit.minutes_remaining} minutes
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Prepaid credits are used first, then free allowance
                      </p>
                    </div>
                  )}

                  {/* Usage Progress Bar */}
                  {freePlanMinutesUsed > 0 && freePlanMinutes > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Usage This Month</span>
                        <span className="text-xs font-medium text-gray-700">
                          {freePlanMinutesUsed} / {freePlanMinutes}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (freePlanMinutesUsed / freePlanMinutes) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manage Subscription Section - Only show when user has active subscription */}
          {hasActiveSubscription && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Manage Subscription</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowChangePlanModal(true)}
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
                >
                  <CreditCard className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Change Plan</div>
                    <div className="text-sm text-gray-600">Upgrade or downgrade</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all text-left"
                >
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Cancel Subscription</div>
                    <div className="text-sm text-gray-600">Cancel at period end</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowBillingModal(true)}
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left"
                >
                  <FileText className="w-6 h-6 text-gray-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Billing Details</div>
                    <div className="text-sm text-gray-600">View transaction history</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Add-ons Section - One-time packs always visible */}
          {getOneTimePacks().length > 0 && (
            <div className="mb-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Add-ons</h3>
                <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                  Purchase additional minutes that never expire. These work alongside your subscription.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="grid grid-cols-1 gap-4 max-w-md w-full justify-items-center">
                  {getOneTimePacks().map(renderPlanCard)}
                </div>
              </div>
            </div>
          )}

          {/* Subscription Plans Section */}
          {getSubscriptionPlans().length > 0 && (
            <div className="mb-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {hasActiveSubscription ? 'Available Plans' : 'Subscription Plans'}
                </h3>
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

          {/* Empty State - Should not show since plans are hardcoded, but just in case */}
          {plans.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No subscription plans available at this time.</p>
              <p className="text-sm text-gray-500 mt-2">Please contact support.</p>
            </div>
          )}

          {/* Info Note */}
          {(plans.length > 0 || isFreeTierUser) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> All plans include usage-based billing. You'll only be charged for minutes used beyond your included minutes, if applicable.
              </p>
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

