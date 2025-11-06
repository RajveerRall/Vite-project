import React from 'react';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export const UsageLimitModal: React.FC<UsageLimitModalProps> = ({
  isOpen,
  onClose,
  onSignIn
}) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-900 mb-6 text-base sm:text-lg">
          Free minutes used. Sign up to continue reading for free.
        </p>
        
          <button
            onClick={onSignIn}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium shadow-md text-base"
          >
          Sign Up
          </button>
      </div>
    </div>
  );
};
