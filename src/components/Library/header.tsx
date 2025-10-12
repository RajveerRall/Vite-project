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
    setShowAuthModal(true);
  };

  // *** NEW: Don't show loading state for auth ***
  // if (loading) return null; // Remove this

  return (
    // --- The Header Container: Made sticky with a shadow for elevation ---
    <header className="bg-white shadow-sm sticky top-0 z-50">
      
      {/* --- The Content Wrapper: Controls max-width and padding --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* === Left Side: The App Logo/Name and Navigation === */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl sm:text-2xl font-semibold text-gray-800">YoRead</Link>
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
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-md transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  Sign In
                </button>
            )}

            {/* --- Logged-In State - Desktop --- */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-x-4">
                {/* Pro Badge */}
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  Pro
                </span>
                
                {/* TTS Usage */}
                <div className="flex items-center gap-x-1">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-l-full">
                    {usageLoading ? 'Usage: …' : `Usage: ${usedMinutes ?? 0}/${totalMinutes} min`}
                  </span>
                  <button 
                    onClick={() => refresh()}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-1.5 py-1 rounded-r-full transition-colors"
                    title="Refresh usage data"
                    disabled={usageLoading}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                {/* Full Cast Usage */}
                <div className="flex items-center gap-x-1">
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-l-full">
                    {fcLoading ? 'Full Cast: …' : `Full Cast: ${fcUsed ?? 0}/${fcTotal} min`}
                  </span>
                  <button 
                    onClick={() => fcRefresh()}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs px-1.5 py-1 rounded-r-full transition-colors"
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
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
            
            {/* --- Logged-In State - Mobile (Simplified) --- */}
            {isAuthenticated && (
              <div className="md:hidden flex items-center gap-x-2">
                {/* Pro Badge - Mobile */}
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full">
                  Pro
                </span>
                
                {/* Sign Out Button - Mobile */}
                <button 
                  onClick={signOut}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                >
                  Sign Out
                </button>
                
                {/* Mobile Menu Button - At the very end */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
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
        <div ref={mobileMenuRef} className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full">
                    Pro
                  </span>
                </div>
              </div>
              
              {/* Usage Stats */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Usage Statistics</h3>
                
                {/* TTS Usage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">TTS Usage</span>
                  <div className="flex items-center gap-x-1">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-l-full">
                      {usageLoading ? '…' : `${usedMinutes ?? 0}/${totalMinutes} min`}
                    </span>
                    <button 
                      onClick={() => {
                        refresh();
                        setShowMobileMenu(false);
                      }}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-1.5 py-1 rounded-r-full transition-colors"
                      title="Refresh usage data"
                      disabled={usageLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Full Cast Usage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Full Cast Usage</span>
                  <div className="flex items-center gap-x-1">
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-l-full">
                      {fcLoading ? '…' : `${fcUsed ?? 0}/${fcTotal} min`}
                    </span>
                    <button 
                      onClick={() => {
                        fcRefresh();
                        setShowMobileMenu(false);
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs px-1.5 py-1 rounded-r-full transition-colors"
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
                <AuthForm onSuccess={() => setShowAuthModal(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;