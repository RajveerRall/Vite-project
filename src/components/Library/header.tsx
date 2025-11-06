// // // src/components/Header.tsx
// // import React from 'react';
// // import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
// // import './Header.css'; // We'll create this for basic styling

// // const Header: React.FC = () => {
// //   return (
// //     <header className="library-header border-b border-gray-200 py-3">
// //       <div className="header-content max-w-4xl mx-auto px-4 flex justify-between items-center">
// //         <h1 className="text-2xl font-medium text-gray-800">YoRead</h1>
        
// //         <div className="auth-controls">
// //           {/* This content is shown to logged-out users */}
// //           <SignedOut>
// //             <div className="sign-in-button-container">
// //               <SignInButton mode="modal" />
// //             </div>
// //           </SignedOut>

// //           {/* This content is shown to logged-in users */}
// //           <SignedIn>
// //             <UserButton afterSignOutUrl="/" />
// //           </SignedIn>
// //         </div>
// //       </div>
// //     </header>
// //   );
// // };

// // export default Header;

// // src/components/Header.tsx
// import React from 'react';
// import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

// // We no longer need the separate CSS file
// // import './Header.css'; 

// const Header: React.FC = () => {
//   return (
//     <header className="library-header border-b border-gray-200 py-3">
//       <div className="header-content max-w-4xl mx-auto px-4 flex justify-between items-center">
//         <h1 className="text-2xl font-medium text-gray-800">YoRead</h1>
        
//         <div className="auth-controls">
//           {/* === LOGGED-OUT STATE === */}
//           <SignedOut>
//             {/* 
//               The SignInButton component from Clerk can wrap your own custom button.
//               It becomes an invisible "controller" for the element inside it.
//             */}
//             <SignInButton mode="modal">
//               <button 
//                 className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-md transition-colors font-medium text-sm"
//               >
//                 Sign In
//               </button>
//             </SignInButton>
//           </SignedOut>

//           {/* === LOGGED-IN STATE === */}
//           <SignedIn>
//             {/* The UserButton is fine as is, and we'll keep the redirect prop. */}
//             <UserButton afterSignOutUrl="/" />
//           </SignedIn>
//         </div>
//       </div>
//     </header>
//   );
// };

// export default Header;


import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { AuthForm } from "../Auth/AuthForm";
import { useFullCastUsage } from "../../hooks/useFullCastUsage";
import { useAnonymousUsageLimit } from "../../hooks/useAnonymousUsageLimit";
import { useSubscription } from "../../context/SubscriptionContext";
import { SubscriptionModal } from "../Subscription/SubscriptionModal";
import { Menu, X, RefreshCw, Sparkles, User, LogOut, Settings } from 'lucide-react';

const Header: React.FC = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const { usedMinutes: fcUsed, totalMinutes: fcTotal, loading: fcLoading, refresh: fcRefresh } = useFullCastUsage();
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
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const accountDrawerRef = useRef<HTMLDivElement>(null);
  
  // Feature flag - set to true to re-enable Full Cast tracker
  const SHOW_FULL_CAST = false;

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
      if (accountDrawerRef.current && !accountDrawerRef.current.contains(event.target as Node)) {
        setShowAccountDrawer(false);
      }
    };

    if (showMobileMenu || showAccountDrawer) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu, showAccountDrawer]);

  const handleSignInClick = async () => {
    // Don't check for existing session - user should manually sign in
    // This prevents auto-authentication from browser session tokens
    // Users must explicitly enter their credentials to sign in
    console.log('[Header] Opening auth modal');
    setShowAuthModal(true);
  };

  // *** NEW: Don't show loading state for auth ***
  // if (loading) return null; // Remove this

  return (
    // --- The Header Container: Clean white background ---
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      
      {/* --- The Content Wrapper: Controls max-width and padding --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* === Left Side: The App Logo/Name and Navigation === */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div>
                <img 
                  src="/assets/yologo.webp" 
                  alt="YoRead Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-amber-800 transition-colors duration-200">
                YoRead
              </span>
            </Link>
            {isAuthenticated && (
              <nav className="hidden md:flex space-x-6">
                {/* Scanner temporarily disabled */}
                {/* <Link to="/scanner" className="text-gray-600 hover:text-amber-800 transition-colors">
                  Scan Book
                </Link> */}
              </nav>
            )}
          </div>

          {/* === Right Side: Authentication Controls === */}
          <div className="auth-controls">
            
            {/* --- Logged-Out State --- */}
            {!isAuthenticated && (
                <button 
                onClick={handleSignInClick}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-full transition-colors font-medium text-sm"
                >
                  Sign In
                </button>
            )}

            {/* --- Logged-In State - Desktop --- */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-x-4">
                {/* Upgrade Button - Show when not subscribed or near limit */}
                {(!isSubscribed || (minutesRemaining !== null && minutesRemaining < 10)) && (
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full transition-colors font-medium text-sm shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upgrade Now
                  </button>
                )}
                
                {/* Pro Badge - Only show if subscribed */}
                {isSubscribed && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300">
                    Pro
                  </span>
                )}
                
                {/* TTS Usage */}
                {isAuthenticated && (
                  <div className="flex items-center gap-x-2 text-sm text-gray-700">
                    <span className="font-medium">
                      {usageLimit ? (
                        // Use subscription_minutes_used from usageLimit, display with limit + prepaid
                        `${usageLimit.minutes_used}/${usageLimit.minutes_limit + (usageLimit.prepaid_minutes || 0)} min`
                      ) : subscriptionInfo?.profile ? (
                        // Fallback: show usage from subscriptionInfo if usageLimit not loaded yet
                        `${subscriptionInfo.profile.subscription_minutes_used 
                          ? Math.ceil(subscriptionInfo.profile.subscription_minutes_used / 60)
                          : Math.ceil((subscriptionInfo.profile.tts_minutes_used || 0) / 60)}/${(subscriptionInfo.profile.tts_minutes_limit || 0) + (subscriptionInfo.profile.prepaid_minutes || 0)} min`
                      ) : subscriptionLoading ? (
                        'Loading...'
                      ) : (
                        'No data'
                      )}
                    </span>
                    <button 
                      onClick={() => {
                        // Refresh SubscriptionContext which both header and account page use
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
                )}
                
                {/* Anonymous Usage Badge */}
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
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Get more →
                    </button>
                  </div>
                )}
                
                {/* Full Cast Usage */}
                {SHOW_FULL_CAST && (
                  <div className="flex items-center gap-x-2 text-sm text-gray-700">
                    <span className="font-medium">
                      {fcLoading ? 'Full Cast: …' : `Full Cast: ${fcUsed ?? 0}/${fcTotal} min`}
                    </span>
                    <button 
                      onClick={() => fcRefresh()}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title="Refresh Full Cast usage"
                      disabled={fcLoading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {/* Profile Icon with Account Drawer */}
                <div className="relative">
                  <button
                    onClick={() => setShowAccountDrawer(!showAccountDrawer)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                    title={user?.email || 'Account'}
                  >
                    <User className="w-5 h-5 text-gray-700" />
                  </button>

                  {/* Account Drawer */}
                  {showAccountDrawer && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40 bg-black bg-opacity-25"
                        onClick={() => setShowAccountDrawer(false)}
                      />
                      {/* Drawer Menu */}
                      <div
                        ref={accountDrawerRef}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* User Email Display */}
                        <div className="px-4 py-3 border-b border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Signed in as</div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user?.email}
                          </div>
                        </div>
                        {/* Menu Items */}
                        <Link
                          to="/account"
                          onClick={() => setShowAccountDrawer(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Account</span>
                        </Link>
                        <button
                          onClick={() => {
                            setShowAccountDrawer(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* --- Logged-In State - Mobile (Simplified) --- */}
            {isAuthenticated && (
              <div className="md:hidden flex items-center gap-x-2">
                {/* Upgrade Button - Mobile - Show when not subscribed or near limit */}
                {(!isSubscribed || (minutesRemaining !== null && minutesRemaining < 10)) && (
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full transition-colors font-medium text-xs shadow-md"
                  >
                    <Sparkles className="w-3 h-3" />
                    Upgrade
                  </button>
                )}
                
                {/* Pro Badge - Mobile - Only show if subscribed */}
                {isSubscribed && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300">
                    Pro
                  </span>
                )}
                
                {/* Sign Out Button - Mobile */}
                <button 
                  onClick={signOut}
                  className="px-3 py-1.5 text-xs text-gray-700 hover:text-gray-900 border border-gray-300 rounded-full transition-colors"
                >
                  Sign Out
                </button>
                
                {/* Mobile Menu Button - At the very end */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  aria-label="Toggle mobile menu"
                >
                  {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {isAuthenticated && showMobileMenu && (
        <div ref={mobileMenuRef} className="md:hidden bg-white border-t border-gray-200 shadow-xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="space-y-5">
              {/* User Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                  {isSubscribed && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300 mt-1 inline-block">
                      Pro
                    </span>
                  )}
                </div>
              </div>

              {/* Account Link */}
              <Link
                to="/account"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
              >
                <Settings className="w-4 h-4" />
                <span>Account</span>
              </Link>
              
              {/* Usage Stats */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-800 bg-gradient-to-r from-gray-100 to-amber-100 px-3 py-2 rounded-lg">Usage Statistics</h3>
                
                {/* Upgrade Button in Mobile Menu */}
                {(!isSubscribed || (minutesRemaining !== null && minutesRemaining < 10)) && (
                  <button
                    onClick={() => {
                      setShowSubscriptionModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upgrade Plan
                  </button>
                )}
                
                {/* TTS Usage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">TTS Usage</span>
                  <div className="flex items-center gap-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      {usageLimit ? (
                        `${usageLimit.minutes_used}/${usageLimit.minutes_limit + (usageLimit.prepaid_minutes || 0)} min`
                      ) : subscriptionInfo?.profile ? (
                        `${subscriptionInfo.profile.subscription_minutes_used 
                          ? Math.ceil(subscriptionInfo.profile.subscription_minutes_used / 60)
                          : Math.ceil((subscriptionInfo.profile.tts_minutes_used || 0) / 60)}/${(subscriptionInfo.profile.tts_minutes_limit || 0) + (subscriptionInfo.profile.prepaid_minutes || 0)} min`
                      ) : subscriptionLoading ? (
                        '…'
                      ) : (
                        'No data'
                      )}
                    </span>
                    <button 
                      onClick={() => {
                        refreshUsageLimit();
                        refreshSubscription();
                        setShowMobileMenu(false);
                      }}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title="Refresh usage data"
                      disabled={subscriptionLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${subscriptionLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {/* Full Cast Usage */}
                {SHOW_FULL_CAST && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Full Cast Usage</span>
                    <div className="flex items-center gap-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        {fcLoading ? '…' : `${fcUsed ?? 0}/${fcTotal} min`}
                      </span>
                      <button 
                        onClick={() => {
                          fcRefresh();
                          setShowMobileMenu(false);
                        }}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="Refresh Full Cast usage"
                        disabled={fcLoading}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  console.log('[Header] AuthForm onSuccess called, closing modal');
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

export default Header;