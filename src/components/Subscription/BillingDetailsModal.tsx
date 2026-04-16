/**
 * Billing Details Modal
 * Shows transaction history and billing information
 */

import React from 'react';
import { X } from 'lucide-react';
import { TransactionList } from '../Account/TransactionList';

interface BillingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillingDetailsModal: React.FC<BillingDetailsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Billing Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <TransactionList limit={50} />
        </div>
      </div>
    </div>
  );
};

