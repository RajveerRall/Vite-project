import React, { useEffect, useState } from 'react';

interface UsageWarningToastProps {
  remainingMinutes: number;
  percentageUsed: number;
  isCritical: boolean;
}

export const UsageWarningToast: React.FC<UsageWarningToastProps> = ({
  remainingMinutes,
  percentageUsed,
  isCritical
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  
  useEffect(() => {
    // Show warning at 80% or 90%, but only once per session
    if (!hasShown && (percentageUsed >= 80)) {
      setIsVisible(true);
      setHasShown(true);
      
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [percentageUsed, hasShown]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className={`rounded-lg shadow-lg p-4 ${isCritical ? 'bg-red-50 border-2 border-red-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
        <div className="flex items-start">
          <div className={`flex-shrink-0 w-6 h-6 ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${isCritical ? 'text-red-800' : 'text-amber-800'}`}>
              {isCritical ? 'Almost Out of Free Minutes!' : 'Running Low on Free Minutes'}
            </h3>
            <p className={`mt-1 text-sm ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
              You have <strong>{remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}</strong> remaining this month.
              Sign up to get 1000 minutes/month!
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

