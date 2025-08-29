import React from 'react';
import './CTAComponent.css';

interface CTAComponentProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  variant?: 'primary' | 'secondary' | 'newsletter' | 'download' | 'ebook';
}

const CTAComponent: React.FC<CTAComponentProps> = ({
  title = "Ready to get started?",
  description = "Join thousands of readers who are already using our platform to improve their reading experience.",
  buttonText = "Get Started",
  buttonLink = "#",
  variant = "primary"
}) => {
  const handleButtonClick = () => {
    if (buttonLink.startsWith('#')) {
      // Handle internal navigation
      const element = document.querySelector(buttonLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Handle external links
      window.open(buttonLink, '_blank');
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'newsletter':
        return {
          icon: '📧',
          bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          buttonColor: '#667eea'
        };
      case 'download':
        return {
          icon: '🎧',
          bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          buttonColor: '#667eea'
        };
      case 'ebook':
        return {
          icon: '📚',
          bgColor: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
          buttonColor: '#ff6b6b'
        };
      case 'secondary':
        return {
          icon: '🚀',
          bgColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          buttonColor: '#4facfe'
        };
      default:
        return {
          icon: '✨',
          bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          buttonColor: '#667eea'
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <div className="cta-container">
      <div className="cta-icon">
        {variantStyles.icon}
      </div>
      
      <div className="cta-content">
        <h3 className="cta-title">{title}</h3>
        <p className="cta-description">{description}</p>
        
        <button 
          className="cta-button"
          onClick={handleButtonClick}
        >
          {buttonText}
        </button>
      </div>
      
      {/* Additional features based on variant */}
      {variant === 'newsletter' && (
        <div className="cta-newsletter">
          <input 
            type="email" 
            placeholder="Enter your email"
            className="cta-email-input"
          />
          <small className="cta-privacy">
            We respect your privacy. Unsubscribe at any time.
          </small>
        </div>
      )}
      
      {variant === 'download' && (
        <div className="cta-download-info">
          <div className="download-stats">
            <span className="stat">🎯 100+ Ebook Formats</span>
            <span className="stat">🎧 Natural Voice AI</span>
            <span className="stat">⚡ Instant Conversion</span>
            <span className="stat">📱 Mobile & Desktop</span>
          </div>
        </div>
      )}
      
      {variant === 'ebook' && (
        <div className="cta-ebook-info">
          <div className="ebook-features">
            <span className="feature">🎭 Multiple Voices</span>
            <span className="feature">🎵 Adjustable Speed</span>
            <span className="feature">🔊 High Quality Audio</span>
            <span className="feature">💾 Offline Listening</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CTAComponent;
