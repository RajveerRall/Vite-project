import React from 'react';
import SupabaseGoogleButton from './SupabaseGoogleButton';

interface AuthFormProps {
  onSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const handleGoogleSuccess = () => onSuccess?.();
  const handleGoogleError = (err: Error) => console.error(err);

  return (
    <div className={onSuccess ? "py-4" : "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"}>
      <div className="max-w-md w-full space-y-6">
        <div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">Sign in</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Use Google to continue</p>
        </div>

        <div className="mt-2">
          <SupabaseGoogleButton 
            onSuccess={handleGoogleSuccess} 
            onError={handleGoogleError} 
          />
        </div>
      </div>
    </div>
  );
};