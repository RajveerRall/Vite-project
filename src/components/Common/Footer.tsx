import React from 'react';
import { Link } from 'react-router-dom';

// Book collage now uses optimized sprite sheet instead of individual images

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-white border-t border-gray-200 py-8">
      {/* Full-width background - breaks out of max-w-4xl container */}
      <div className="absolute left-1/2 -translate-x-1/2 w-screen top-0 bottom-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient overlay for readability with glassy blur effect and linear shadow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-gray-900/40 z-10" style={{ backdropFilter: 'blur(2px)' }}></div>
          
          {/* Book covers sprite - optimized single image */}
          <div 
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: 'url(/assets/book-collage-sprite.webp)',
              backgroundSize: '800px 600px',
              backgroundPosition: 'center',
              backgroundRepeat: 'repeat'
            }}
          />
        </div>
      </div>

      {/* Content - stays within max-w-4xl */}
      <div className="relative z-20">
        <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">YoRead</h3>
                                      <p className="text-gray-600 text-sm">
               Transform your ebooks into immersive audiobooks with natural AI voices.
             </p>
          </div>

          {/* Contact & Feedback */}
          <div className="text-center md:text-right">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Contact & Share Feedback</h4>
            <div className="flex flex-col space-y-2">
              <a 
                href="mailto:rajveer@yoread.com" 
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                rajveer@yoread.com
              </a>
              <a 
                href="https://discord.gg/FfSbEzMY" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Discord
              </a>
            </div>
          </div>
        </div>

          {/* Navigation Links */}
          <div className="border-t border-gray-200 mt-6 pt-6">
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <Link to="/ai-pdf-reader" className="text-gray-600 hover:text-gray-900 underline text-sm transition-colors">
                PDF Reader
              </Link>
              <Link to="/speechify-alternative" className="text-gray-600 hover:text-gray-900 underline text-sm transition-colors">
                Speechify Alternative
              </Link>
              <Link to="/privacy" className="text-gray-600 hover:text-gray-900 underline text-sm transition-colors">
                Privacy Policy
              </Link>
              <a href="/terms" className="text-gray-600 hover:text-gray-900 underline text-sm transition-colors">
                Terms of Service
              </a>
            </div>
            <p className="text-gray-500 text-sm text-center">
              © 2025 YoRead. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
