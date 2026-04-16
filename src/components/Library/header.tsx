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

            {/* Mobile App Download CTA */}
            <a
              href="https://play.google.com/store/apps/details?id=com.yoread.app&hl=en_IN&utm_source=yoread_web&utm_medium=header&utm_campaign=app_launch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <svg
                className="w-4 h-4 sm:w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download App</span>
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;