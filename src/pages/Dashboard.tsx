/**
 * Dashboard Page
 * Redirects to /account with query parameters preserved
 * This handles DodoPayments redirects that go to /dashboard
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect to /account with all query parameters preserved
    const searchParams = location.search;
    navigate(`/account${searchParams}`, { replace: true });
  }, [navigate, location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-gray-600">Redirecting...</div>
    </div>
  );
};

export default Dashboard;

