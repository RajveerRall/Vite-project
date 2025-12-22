import React, { useState } from 'react';
import './AppBetaModal.css'; // You'll create this CSS file

interface AppBetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, reason: string) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

const AppBetaModal: React.FC<AppBetaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  isSuccess,
  error,
}) => {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !reason) {
      alert('Please fill in both your email and reason.');
      return;
    }
    await onSubmit(email, reason);
  };

  if (!isOpen) return null;

  return (
    <div className="app-beta-modal-overlay">
      <div className="app-beta-modal-content">
        <button className="app-beta-modal-close" onClick={onClose}>&times;</button>
        <h2>Join the Yoread Android Beta!</h2>
        <p>
          We're excited to announce the beta launch of our Android app!
          As a thank you for your feedback, beta testers will receive an additional 10 hours of listening time!
        </p>
        <p>Fill out the form below if you're interested in participating:</p>

        {isSuccess ? (
          <div className="app-beta-modal-success">
            <h3>Thank you for your interest!</h3>
            <p>We've received your submission and will be in touch soon with details on how to access the beta and claim your extra listening hours.</p>
            <button className="app-beta-modal-button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reason">Why do you want to listen to your ebooks?</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
                disabled={isLoading}
              ></textarea>
            </div>
            {error && <p className="app-beta-modal-error">{error}</p>}
            <button type="submit" className="app-beta-modal-button" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit and Get 10 Hours!'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AppBetaModal;