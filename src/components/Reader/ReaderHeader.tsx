// src/components/Reader/ReaderHeader.tsx
// Header component for Reader (mobile + desktop variants)

import React, { useState } from 'react';
import { ChevronLeft, Headphones, RefreshCw, Sparkles } from 'lucide-react';
import { TOCItem } from '../../types/books';
import MobileTOCDrawer from './MobileTOCDrawer';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAnonymousUsageLimit } from '../../hooks/useAnonymousUsageLimit';
import { AuthForm } from '../Auth/AuthForm';
import { SubscriptionModal } from '../Subscription/SubscriptionModal';

export interface ReaderHeaderProps {
  // Book info
  bookTitle: string;
  currentChapterTitle?: string;
  
  // Actions
  onClose: () => void;
  onNavigateToTocItem: (item: TOCItem) => void;
  onScrollToHighlight: () => void;
  
  // UI state
  isMobile: boolean;
  isEnhanced: boolean;
  isFirstOpen: boolean;
  theme: 'light' | 'dark' | 'sepia';
  showTTSHighlight: boolean; // Whether to show scroll-to-highlight button
  
  // Data
  toc: TOCItem[];
}

/**
 * Reader header component with mobile and desktop variants
 * Extracted from Reader component to improve maintainability
 */
export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  bookTitle,
  currentChapterTitle,
  onClose,
  onNavigateToTocItem,
  onScrollToHighlight,
  isMobile,
  isEnhanced,
  isFirstOpen,
  theme,
  showTTSHighlight,
  toc,
}) => {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const anonymousLimit = useAnonymousUsageLimit();
  const { 
    isSubscribed, 
    minutesRemaining, 
    usageLimit, 
    subscriptionInfo,
    loading: subscriptionLoading,
    refreshUsageLimit,
    refreshSubscription
  } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleSignInClick = async () => {
    console.log('[ReaderHeader] Opening auth modal');
    setShowAuthModal(true);
  };

  return (
    <header className="reader-header">
      {/* Mobile: Stacked layout */}
      <div className="reader-header-mobile md:hidden">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="back-button text-sm font-medium text-gray-600 hover:text-amber-800 flex items-center gap-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Library</span>
            <span className="sm:hidden">Back</span>
          </button>
          
          {/* Mobile: Auth controls */}
          <div className="flex items-center gap-x-2">
            {/* Sign In Button - Mobile */}
            {!isAuthenticated && (
              <button 
                onClick={handleSignInClick}
                className="px-5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-full transition-colors font-medium text-xs"
              >
                Sign In
              </button>
            )}
            
            {/* Anonymous Usage Badge - Mobile */}
            {!isAuthenticated && anonymousLimit && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                anonymousLimit.isLimitReached ? 'bg-red-100 text-red-700' :
                anonymousLimit.isCritical ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {anonymousLimit.remainingMinutes}/{anonymousLimit.limitMinutes} min
              </div>
            )}
            
            {/* Authenticated User Controls - Mobile */}
            {isAuthenticated && (
              <>
                {/* Upgrade Button - Mobile */}
                {(!isSubscribed || (minutesRemaining !== null && minutesRemaining < 10)) && (
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-full transition-colors font-medium text-xs shadow-md"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </button>
                )}
                
                {/* Pro Badge - Mobile */}
                {isSubscribed && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full border border-amber-300">
                    Pro
                  </span>
                )}
                
                {/* Usage Metrics - Mobile */}
                <div className="flex items-center gap-x-1 text-xs text-gray-700">
                  <span className="font-medium">
                    {usageLimit ? (
                      // Backend now returns minutes_remaining that includes free tier limit + prepaid
                      usageLimit.minutes_remaining !== null && usageLimit.minutes_remaining !== undefined
                        ? `${(usageLimit.minutes_remaining / 60).toFixed(1)}h`
                        : '0h'
                    ) : subscriptionInfo?.profile ? (
                      // Fallback: calculate from profile data if usageLimit not available
                      (() => {
                        const subscriptionLimit = subscriptionInfo.profile.tts_minutes_limit || 0;
                        const subscriptionUsed = subscriptionInfo.profile.subscription_minutes_used 
                          ? subscriptionInfo.profile.subscription_minutes_used / 60
                          : (subscriptionInfo.profile.tts_minutes_used || 0) / 60;
                        const prepaidMinutes = subscriptionInfo.profile.prepaid_minutes || 0;
                        
                        // If no subscription limit and no subscription, use free tier limit (360 minutes)
                        let effectiveLimit = subscriptionLimit;
                        if (subscriptionLimit === 0 && !isSubscribed) {
                          effectiveLimit = 360; // Free tier limit
                        }
                        
                        const remaining = Math.max(0, (effectiveLimit - subscriptionUsed) + prepaidMinutes);
                        return remaining > 0 ? `${(remaining / 60).toFixed(1)}h` : '0h';
                      })()
                    ) : subscriptionLoading ? (
                      '…'
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="book-title text-lg sm:text-xl">{bookTitle}</h2>
          {currentChapterTitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{currentChapterTitle}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mt-2">
          {isEnhanced && (
            <MobileTOCDrawer
              toc={toc}
              onItemClick={onNavigateToTocItem}
              theme={theme}
              openByDefault={isMobile && isFirstOpen}
            />
          )}

          {showTTSHighlight && (
            <button
              onClick={onScrollToHighlight}
              className="scroll-highlight-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Scroll to current highlight"
              title="Scroll to current highlight"
            >
              <Headphones className="w-5 h-5" />
              <span className="text-sm font-medium">Highlight</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="reader-header-desktop hidden md:flex items-center justify-between w-full">
        <div className="reader-left">
          <button
            onClick={onClose}
            className="back-button text-sm font-medium text-gray-600 hover:text-amber-800 flex items-center gap-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Library
          </button>
        </div>

        <div className="reader-center text-center">
          <h2 className="book-title">{bookTitle}</h2>
          {currentChapterTitle && (
            <p className="text-sm text-gray-500 mt-0.5">{currentChapterTitle}</p>
          )}
        </div>

        <div className="reader-right flex items-center gap-3">
          {/* Sign In Button - Desktop */}
          {!isAuthenticated && (
            <button 
              onClick={handleSignInClick}
              className="px-7 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-full transition-colors font-medium text-sm"
            >
              Sign In
            </button>
          )}
          
          {/* Anonymous Usage Badge - Desktop */}
          {!isAuthenticated && anonymousLimit && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`px-3 py-1 rounded-full ${
                anonymousLimit.isLimitReached ? 'bg-red-100 text-red-700' :
                anonymousLimit.isCritical ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <span className="font-medium">
                  {anonymousLimit.remainingMinutes}/{anonymousLimit.limitMinutes} min left
                </span>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Get more →
              </button>
            </div>
          )}
          
          {/* Authenticated User Controls - Desktop */}
          {isAuthenticated && (
            <>
              {/* Upgrade Button - Desktop */}
              {(!isSubscribed || (minutesRemaining !== null && minutesRemaining < 10)) && (
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-full transition-colors font-medium text-sm shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade Now
                </button>
              )}
              
              {/* Pro Badge - Desktop */}
              {isSubscribed && (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300">
                  Pro
                </span>
              )}
              
              {/* TTS Usage - Desktop */}
              <div className="flex items-center gap-x-2 text-sm text-gray-700">
                <span className="font-medium">
                  {usageLimit ? (
                    // Backend now returns minutes_remaining that includes free tier limit + prepaid
                    usageLimit.minutes_remaining !== null && usageLimit.minutes_remaining !== undefined
                      ? `${(usageLimit.minutes_remaining / 60).toFixed(1)} hrs`
                      : '0 hrs'
                  ) : subscriptionInfo?.profile ? (
                    // Fallback: calculate from profile data if usageLimit not available
                    (() => {
                      const subscriptionLimit = subscriptionInfo.profile.tts_minutes_limit || 0;
                      const subscriptionUsed = subscriptionInfo.profile.subscription_minutes_used 
                        ? subscriptionInfo.profile.subscription_minutes_used / 60
                        : (subscriptionInfo.profile.tts_minutes_used || 0) / 60;
                      const prepaidMinutes = subscriptionInfo.profile.prepaid_minutes || 0;
                      
                      // If no subscription limit and no subscription, use free tier limit (360 minutes)
                      let effectiveLimit = subscriptionLimit;
                      if (subscriptionLimit === 0 && !isSubscribed) {
                        effectiveLimit = 360; // Free tier limit
                      }
                      
                      const remaining = Math.max(0, (effectiveLimit - subscriptionUsed) + prepaidMinutes);
                      return remaining > 0 ? `${(remaining / 60).toFixed(1)} hrs` : '0 hrs';
                    })()
                  ) : subscriptionLoading ? (
                    'Loading...'
                  ) : (
                    'No data'
                  )}
                </span>
                <button 
                  onClick={() => {
                    refreshUsageLimit();
                    refreshSubscription();
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Refresh usage data"
                  disabled={subscriptionLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${subscriptionLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </>
          )}
          
          {/* Highlight Button - Keep existing functionality */}
          {showTTSHighlight && (
            <button
              onClick={onScrollToHighlight}
              className="scroll-highlight-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Scroll to current highlight"
              title="Scroll to current highlight"
            >
              <Headphones className="w-5 h-5" />
              <span className="text-sm font-medium">Highlight</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowAuthModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Sign In / Sign Up</h3>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <AuthForm onSuccess={() => {
                  console.log('[ReaderHeader] AuthForm onSuccess called, closing modal');
                  setShowAuthModal(false);
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </header>
  );
};

