import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-8">
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
            <a 
              href="mailto:rajveer@yoread.com" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              rajveer@yoread.com
            </a>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-6 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 YoRead. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
