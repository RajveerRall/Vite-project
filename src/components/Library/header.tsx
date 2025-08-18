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


import React, { useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { AuthForm } from "../Auth/AuthForm";

const Header: React.FC = () => {
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    // --- The Header Container: Made sticky with a shadow for elevation ---
    <header className="bg-white shadow-sm sticky top-0 z-50">
      
      {/* --- The Content Wrapper: Controls max-width and padding --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* === Left Side: The App Logo/Name === */}
          <div className="flex-shrink-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">YoRead</h1>
          </div>

          {/* === Right Side: Authentication Controls === */}
          <div className="auth-controls">
            
            {/* --- Logged-Out State --- */}
            {!isAuthenticated && (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-md transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                Sign In
              </button>
            )}

            {/* --- Logged-In State --- */}
            {isAuthenticated && (
              <div className="flex items-center gap-x-4">
                
                {/* A small "Pro" badge to add value to the logged-in experience */}
                <span className="hidden sm:inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  Pro
                </span>

                {/* User email and sign out button */}
                <span className="hidden sm:inline text-sm text-gray-600">
                  {user?.email}
                </span>
                <button 
                  onClick={handleSignOut}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                >
                  Sign Out
                </button>

              </div>
            )}
          </div>

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