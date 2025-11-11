import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SupabaseGoogleButton from './SupabaseGoogleButton';
import GoogleSignIn from './GoogleSignIn';
import { Capacitor } from '@capacitor/core';

interface AuthFormProps {
  onSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('[AuthForm] Starting sign-in process...');

    try {
      if (isLogin) {
        console.log('[AuthForm] Calling signIn...');
        await signIn(email, password);
        console.log('[AuthForm] Sign-in successful, calling onSuccess...');
        // Only close modal after successful sign-in
        onSuccess?.();
      } else {
        await signUp(email, password);
        setError('Check your email for verification link!');
        // Don't close modal on sign-up, user needs to see the verification message
      }
    } catch (err: any) {
      console.log('[AuthForm] Sign-in failed, setting error:', err.message);
      // Provide user-friendly error messages
      const errorMessage = err.message || 'An error occurred';
      if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email address before signing in.');
      } else if (errorMessage.toLowerCase().includes('user not found')) {
        setError('No account found with this email. Please sign up first.');
      } else if (errorMessage.toLowerCase().includes('email already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(errorMessage);
      }
      console.log('[AuthForm] Error set, modal should stay open');
    } finally {
      console.log('[AuthForm] Setting loading to false');
      setLoading(false);
    }
  };

  const handleGoogleSuccess = () => onSuccess?.();
  const handleGoogleError = (err: Error) => {
    // Provide user-friendly error messages for Google sign-in
    const errorMessage = err.message || 'Google sign-in failed';
    if (errorMessage.toLowerCase().includes('popup') || errorMessage.toLowerCase().includes('closed')) {
      setError('Sign-in was cancelled. Please try again.');
    } else if (errorMessage.toLowerCase().includes('blocked')) {
      setError('Pop-up was blocked. Please allow pop-ups and try again.');
    } else {
      setError(`Google sign-in failed: ${errorMessage}`);
    }
  };

  return (
    <div className={onSuccess ? "py-4" : "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create new account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your ebook library from anywhere
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className={`rounded-md p-3 ${
              error.includes('Check your email') || error.includes('verification') 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm text-center font-medium ${
                error.includes('Check your email') || error.includes('verification')
                  ? 'text-green-800' 
                  : 'text-red-800'
              }`}>
              {error}
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>

          <div className="text-center mt-4">
            <button
              type="button"
              className="text-indigo-600 hover:text-indigo-500"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-4 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-4">
          {Capacitor.isNativePlatform() ? (
            <SupabaseGoogleButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          ) : (
            <GoogleSignIn onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          )}
        </div>
      </div>
    </div>
  );
};