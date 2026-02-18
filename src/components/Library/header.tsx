import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Simplified Header for Free Mode
 * Removes all authentication, subscription, and usage tracking UI elements
 * to provide a clean, uncluttered interface as requested.
 */
const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo and App Name */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div>
                <img
                  src="/assets/yologo.ico"
                  alt="YoRead Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-amber-800 transition-colors duration-200">
                YoRead
              </span>
            </Link>
          </div>

          {/* Minimal Controls */}
          <div className="flex items-center gap-3">
            {/* Free Mode Indicator */}
            <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 shadow-sm hidden sm:inline-block">
              Free Mode
            </span>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;