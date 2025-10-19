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
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      
      {/* --- The Content Wrapper: Controls max-width and padding --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* === Left Side: The App Logo/Name and Navigation === */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img 
                  src="/assets/yologo.webp" 
                  alt="YoRead Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain transition-all duration-300 group-hover:scale-110 group-hover:rotate-2"
                />
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 rounded-full bg-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 via-amber-800 to-gray-800 bg-clip-text text-transparent group-hover:from-amber-600 group-hover:via-amber-700 group-hover:to-amber-600 transition-all duration-300">
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
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition-all duration-300 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Sign In
                </button>
            )}

            {/* --- Logged-In State - Desktop --- */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-x-4">
                {/* Pro Badge */}
                <span className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300/50 shadow-sm">
                  Pro
                </span>
                
                {/* TTS Usage */}
                <div className="flex items-center gap-x-1">
                  <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-l-full border border-blue-300/50 shadow-sm">
                    {usageLoading ? 'Usage: …' : `Usage: ${usedMinutes ?? 0}/${totalMinutes} min`}
                  </span>
                  <button 
                    onClick={() => refresh()}
                    className="bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 text-xs px-2 py-1.5 rounded-r-full transition-all duration-200 border border-blue-300/50 shadow-sm hover:shadow-md"
                    title="Refresh usage data"
                    disabled={usageLoading}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                {/* Full Cast Usage */}
                <div className="flex items-center gap-x-1">
                  <span className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-l-full border border-purple-300/50 shadow-sm">
                    {fcLoading ? 'Full Cast: …' : `Full Cast: ${fcUsed ?? 0}/${fcTotal} min`}
                  </span>
                  <button 
                    onClick={() => fcRefresh()}
                    className="bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-800 text-xs px-2 py-1.5 rounded-r-full transition-all duration-200 border border-purple-300/50 shadow-sm hover:shadow-md"
                    title="Refresh Full Cast usage"
                    disabled={fcLoading}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                {/* User Email */}
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
                
                {/* Sign Out Button */}
                <button 
                  onClick={signOut}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            )}
            
            {/* --- Logged-In State - Mobile (Simplified) --- */}
            {isAuthenticated && (
              <div className="md:hidden flex items-center gap-x-2">
                {/* Pro Badge - Mobile */}
                <span className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300/50 shadow-sm">
                  Pro
                </span>
                
                {/* Sign Out Button - Mobile */}
                <button 
                  onClick={signOut}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
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
                  <span className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300/50 shadow-sm mt-1 inline-block">
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
                  <div className="flex items-center gap-x-1">
                    <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-l-full border border-blue-300/50 shadow-sm">
                      {usageLoading ? '…' : `${usedMinutes ?? 0}/${totalMinutes} min`}
                    </span>
                    <button 
                      onClick={() => {
                        refresh();
                        setShowMobileMenu(false);
                      }}
                      className="bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 text-xs px-2 py-1.5 rounded-r-full transition-all duration-200 border border-blue-300/50 shadow-sm hover:shadow-md"
                      title="Refresh usage data"
                      disabled={usageLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Full Cast Usage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Full Cast Usage</span>
                  <div className="flex items-center gap-x-1">
                    <span className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-l-full border border-purple-300/50 shadow-sm">
                      {fcLoading ? '…' : `${fcUsed ?? 0}/${fcTotal} min`}
                    </span>
                    <button 
                      onClick={() => {
                        fcRefresh();
                        setShowMobileMenu(false);
                      }}
                      className="bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-800 text-xs px-2 py-1.5 rounded-r-full transition-all duration-200 border border-purple-300/50 shadow-sm hover:shadow-md"
                      title="Refresh Full Cast usage"
                      disabled={fcLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
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