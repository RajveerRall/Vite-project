/**
 * Account Page
 * Unified page displaying account information, subscription details, usage stats, and transaction history
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  fetchSubscriptionInfo, 
  fetchUsageLimit, 
  syncSubscriptionFromDodoPayments,
  SubscriptionInfo, 
  UsageLimitInfo 
} from '../../services/subscription/SubscriptionService';
import { UsageStatsCard } from '../../components/Account/UsageStatsCard';
import { SubscriptionDetailsCard } from '../../components/Account/SubscriptionDetailsCard';
import { TransactionList } from '../../components/Account/TransactionList';
import { SubscriptionModal } from '../../components/Subscription/SubscriptionModal';
import { User, Calendar, Mail } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, isAuthenticated, authInitialized } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [usageLimit, setUsageLimit] = useState<UsageLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    // Only run this logic after the auth state has been confirmed
    if (authInitialized) {
      if (!isAuthenticated) {
        navigate('/'); // Redirect if not logged in
      }
    }
  }, [authInitialized, isAuthenticated, navigate]);

  useEffect(() => {
    // Fetch data only after auth is initialized and user is authenticated
    if (authInitialized && isAuthenticated && user?.id) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          console.log('[AccountPage] Starting data fetch...');
          
          // Fetch subscription info (token is retrieved inside the service)
          console.log('[AccountPage] Fetching subscription info...');
          const subInfo = await fetchSubscriptionInfo(user.id);
          console.log('[AccountPage] Subscription info loaded:', subInfo);
          setSubscriptionInfo(subInfo);

          // Fetch usage limit
          console.log('[AccountPage] Fetching usage limit...');
          const usageInfo = await fetchUsageLimit(user.id);
          console.log('[AccountPage] Usage limit loaded:', usageInfo);
          setUsageLimit(usageInfo);
          
          console.log('[AccountPage] Data fetch complete');
        } catch (err: any) {
          console.error('[AccountPage] Data fetch failed:', err);
          setError(
            err?.message || 
            'Failed to load account data. Please try again later.'
          );
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [authInitialized, isAuthenticated, user?.id]);

  // Handle subscription success redirect from DodoPayments
  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    const paymentId = searchParams.get('payment_id'); // ✅ Add payment_id handling for prepaid purchases
    const status = searchParams.get('status');
    
    // Handle subscription redirects
    if (subscriptionId && status) {
      console.log('[AccountPage] Subscription redirect detected:', { subscriptionId, status });
      
      // Show success message
      if (status === 'active') {
        console.log('[AccountPage] Subscription activated successfully!');
      }
      
      // Refresh subscription data to show updated info
      if (user?.id) {
        const refreshData = async () => {
          try {
            const subInfo = await fetchSubscriptionInfo(user.id);
            setSubscriptionInfo(subInfo);
            const usageInfo = await fetchUsageLimit(user.id);
            setUsageLimit(usageInfo);
          } catch (err) {
            console.error('[AccountPage] Failed to refresh after subscription:', err);
          }
        };
        refreshData();
      }
      
      // Clean up URL parameters after processing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('subscription_id');
      newSearchParams.delete('status');
      setSearchParams(newSearchParams, { replace: true });
    }
    
    // ✅ NEW: Handle prepaid purchase redirects
    if (paymentId && status) {
      console.log('[AccountPage] Prepaid purchase redirect detected:', { paymentId, status });
      
      // Show success message
      if (status === 'succeeded') {
        console.log('[AccountPage] Prepaid purchase succeeded!');
        // Optionally show a toast notification here
      }
      
      // Refresh subscription and transaction data to show updated info
      if (user?.id) {
        const refreshData = async () => {
          try {
            const subInfo = await fetchSubscriptionInfo(user.id);
            setSubscriptionInfo(subInfo);
            const usageInfo = await fetchUsageLimit(user.id);
            setUsageLimit(usageInfo);
            // Transaction list will auto-refresh via its own useEffect
          } catch (err) {
            console.error('[AccountPage] Failed to refresh after prepaid purchase:', err);
          }
        };
        refreshData();
      }
      
      // Clean up URL parameters after processing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('payment_id');
      newSearchParams.delete('status');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user?.id]);

  // Listen for usage updates to refresh data automatically
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const handleUsageUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && !detail.isAnonymous) {
        // Refresh data when usage is tracked
        console.log('[AccountPage] Usage updated, refreshing data...');
        setTimeout(async () => {
          try {
            const subInfo = await fetchSubscriptionInfo(user.id);
            setSubscriptionInfo(subInfo);
            const usageInfo = await fetchUsageLimit(user.id);
            setUsageLimit(usageInfo);
          } catch (err) {
            console.error('[AccountPage] Failed to refresh after usage update:', err);
          }
        }, 500);
      }
    };

    window.addEventListener('tts-usage-updated', handleUsageUpdate);
    return () => window.removeEventListener('tts-usage-updated', handleUsageUpdate);
  }, [isAuthenticated, user?.id]);

  // Show loading state while auth is being initialized
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600 animate-pulse">Initializing Session...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Please sign in to view your account</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600 animate-pulse">Loading Account Data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-red-200">
          <h1 className="text-2xl font-bold text-red-700 mb-4">An Error Occurred</h1>
          <p className="text-gray-700 mb-4">We were unable to load your account data. Please try again later.</p>
          <div className="bg-red-100 p-4 rounded-md text-red-800 text-sm">
            <strong>Error Details:</strong>
            <pre className="whitespace-pre-wrap font-mono mt-2">{error}</pre>
          </div>
          <p className="text-xs text-gray-500 mt-4">Please check the browser console for more technical details.</p>
        </div>
      </div>
    );
  }

  const accountCreatedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const handleRefreshAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const subInfo = await fetchSubscriptionInfo(user.id);
      setSubscriptionInfo(subInfo);
      const usageInfo = await fetchUsageLimit(user.id);
      setUsageLimit(usageInfo);
      
      // If user has an active subscription, sync from DodoPayments
      if (subInfo?.subscription?.payment_gateway_subscription_id) {
        console.log('[AccountPage] Syncing subscription from DodoPayments...');
        const syncResult = await syncSubscriptionFromDodoPayments(
          user.id,
          subInfo.subscription.payment_gateway_subscription_id
        );
        if (syncResult.success) {
          // Refresh subscription info after sync
          const refreshedSubInfo = await fetchSubscriptionInfo(user.id);
          setSubscriptionInfo(refreshedSubInfo);
        } else {
          console.warn('[AccountPage] Subscription sync failed:', syncResult.error);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account</h1>
          <p className="text-gray-600">Manage your account, subscription, and usage</p>
        </div>

        {/* Account Information Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Email</span>
                </div>
                <div className="text-base text-gray-900">{user.email}</div>
              </div>
              {accountCreatedDate && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Member Since</span>
                  </div>
                  <div className="text-base text-gray-900">{accountCreatedDate}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription & Usage Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Subscription & Usage
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SubscriptionDetailsCard 
              subscriptionInfo={subscriptionInfo}
              onUpgradeClick={() => setShowSubscriptionModal(true)} 
            />
            <UsageStatsCard 
              subscriptionInfo={subscriptionInfo}
              usageLimit={usageLimit}
              onRefresh={handleRefreshAll}
              refreshing={loading}
            />
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
          <TransactionList limit={20} />
        </div>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
};

export default AccountPage;

