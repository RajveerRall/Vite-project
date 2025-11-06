/**
 * Transaction List Component
 * Displays list of prepaid transactions with filtering
 */

import React, { useState, useEffect } from 'react';
import { fetchPrepaidTransactions, PrepaidTransaction } from '../../services/subscription/TransactionService';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, Filter, Download, X } from 'lucide-react';

interface TransactionListProps {
  limit?: number;
}

export const TransactionList: React.FC<TransactionListProps> = ({ limit = 50 }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PrepaidTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<PrepaidTransaction['transaction_type'] | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadTransactions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchPrepaidTransactions(user.id, {
        transaction_type: filterType === 'all' ? undefined : filterType,
        limit,
      });
      setTransactions(data);
    } catch (err: any) {
      console.error('[TransactionList] Error loading transactions:', err);
      setError(err?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user?.id, filterType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTransactionType = (type: PrepaidTransaction['transaction_type']) => {
    const types = {
      purchase: { label: 'Prepaid Purchase', color: 'text-green-700 bg-green-100' },
      subscription_renewal: { label: 'Subscription Renewal', color: 'text-blue-700 bg-blue-100' },
      refund: { label: 'Refund', color: 'text-red-700 bg-red-100' },
      expiration: { label: 'Expired', color: 'text-gray-700 bg-gray-100' },
      usage: { label: 'Usage', color: 'text-purple-700 bg-purple-100' },
    };
    return types[type] || { label: type, color: 'text-gray-700 bg-gray-100' };
  };

  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount}`;
  };

  const formatInvoiceAmount = (transaction: PrepaidTransaction) => {
    const amount = transaction.metadata?.amount || 0;
    const currency = transaction.metadata?.currency || 'USD';
    // Amount is typically in cents, convert to dollars
    const amountInDollars = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInDollars);
  };

  const formatInvoiceId = (paymentId: string | null) => {
    if (!paymentId) return null;
    // Show last 8 characters as invoice number
    return paymentId.slice(-8).toUpperCase();
  };

  const downloadInvoice = (paymentId: string | null) => {
    if (!paymentId) return;
    // Link to DodoPayments invoice page (if available)
    const dodoBaseUrl = import.meta.env.VITE_DODO_BASE_URL || 'https://live.dodopayments.com';
    const invoiceUrl = `${dodoBaseUrl}/payments/${paymentId}`;
    window.open(invoiceUrl, '_blank');
  };

  const formatBillingPeriod = (transaction: PrepaidTransaction) => {
    const start = transaction.metadata?.billing_period_start;
    const end = transaction.metadata?.billing_period_end;
    if (!start || !end) return null;
    
    const startDate = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endDate = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startDate} - ${endDate}`;
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">Loading transactions...</div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading transactions</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredTransactions = transactions.filter(
    (t) => filterType === 'all' || t.transaction_type === filterType
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Filter transactions"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            title="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Filter by Type</span>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'purchase', 'subscription_renewal', 'refund', 'usage', 'expiration'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  setShowFilters(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {type === 'all' ? 'All' : type === 'subscription_renewal' ? 'Subscription Renewals' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">No transactions found</div>
          <div className="text-sm text-gray-400">
            {filterType !== 'all'
              ? `No ${filterType} transactions`
              : 'Transactions will appear here after you make purchases'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
            const typeInfo = formatTransactionType(transaction.transaction_type);
            const invoiceId = formatInvoiceId(transaction.payment_id);
            const invoiceAmount = transaction.metadata?.amount ? formatInvoiceAmount(transaction) : null;
            const billingPeriod = formatBillingPeriod(transaction);
            const isSubscriptionRenewal = transaction.transaction_type === 'subscription_renewal';
            
            return (
              <div
                key={transaction.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </span>
                    </div>
                    
                    {/* Plan Name */}
                    {transaction.metadata?.plan_name && (
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {transaction.metadata.plan_name}
                      </div>
                    )}
                    
                    {/* Product ID (if no plan name) */}
                    {!transaction.metadata?.plan_name && transaction.product_id && (
                      <div className="text-sm text-gray-700 mb-1">
                        Product: {transaction.product_id}
                      </div>
                    )}
                    
                    {/* Billing Period (for subscription renewals) */}
                    {billingPeriod && (
                      <div className="text-xs text-gray-500 mb-1">
                        Billing Period: {billingPeriod}
                      </div>
                    )}
                    
                    {/* Invoice ID */}
                    {invoiceId && (
                      <div className="text-xs text-gray-500 mb-1">
                        Invoice #{invoiceId}
                      </div>
                    )}
                  </div>
                  
                  {/* Amount Display */}
                  <div className="text-right">
                    {invoiceAmount && (
                      <div className="text-lg font-semibold text-gray-900 mb-1">
                        {invoiceAmount}
                      </div>
                    )}
                    {transaction.minutes_amount !== 0 && !isSubscriptionRenewal && (
                      <div className={`text-sm font-medium ${
                        transaction.minutes_amount >= 0
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        {formatAmount(transaction.minutes_amount)} min
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Footer with Payment ID and Download */}
                {transaction.payment_id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Payment ID: {transaction.payment_id.slice(0, 20)}...
                    </div>
                    <button
                      onClick={() => downloadInvoice(transaction.payment_id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download Invoice
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {transactions.length >= limit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              // TODO: Implement pagination
              alert('Pagination coming soon');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

