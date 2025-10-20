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
import { useTTSUsage } from "../../hooks/useTTSUsage";
import { useFullCastUsage } from "../../hooks/useFullCastUsage";
import { Menu, X, RefreshCw } from 'lucide-react';

const Header: React.FC = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { usedMinutes, totalMinutes, loading: usageLoading, refresh } = useTTSUsage();
  const { usedMinutes: fcUsed, totalMinutes: fcTotal, loading: fcLoading, refresh: fcRefresh } = useFullCastUsage();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Feature flag - set to true to re-enable Full Cast tracker
  const SHOW_FULL_CAST = false;

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu]);

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
                {/* Pro Badge */}
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300">
                  Pro
                </span>
                
                {/* TTS Usage */}
                <div className="flex items-center gap-x-2 text-sm text-gray-700">
                  <span className="font-medium">
                    {usageLoading ? 'Usage: …' : `Usage: ${usedMinutes ?? 0}/${totalMinutes} min`}
                  </span>
                  <button 
                    onClick={() => refresh()}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Refresh usage data"
                    disabled={usageLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                
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
                
                {/* User Email */}
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
                
                {/* Sign Out Button */}
                <button 
                  onClick={signOut}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-full transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
            
            {/* --- Logged-In State - Mobile (Simplified) --- */}
            {isAuthenticated && (
              <div className="md:hidden flex items-center gap-x-2">
                {/* Pro Badge - Mobile */}
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300">
                  Pro
                </span>
                
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
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300 mt-1 inline-block">
                    Pro
                  </span>
                </div>
              </div>
              
              {/* Usage Stats */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-800 bg-gradient-to-r from-gray-100 to-amber-100 px-3 py-2 rounded-lg">Usage Statistics</h3>
                
                {/* TTS Usage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">TTS Usage</span>
                  <div className="flex items-center gap-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      {usageLoading ? '…' : `${usedMinutes ?? 0}/${totalMinutes} min`}
                    </span>
                    <button 
                      onClick={() => {
                        refresh();
                        setShowMobileMenu(false);
                      }}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title="Refresh usage data"
                      disabled={usageLoading}
                    >
                      <RefreshCw className="h-4 w-4" />
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
    </header>
  );
};

export default Header;