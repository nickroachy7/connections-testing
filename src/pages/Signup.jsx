import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Signup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be between 3 and 20 characters');
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, username);
      // Navigation will happen automatically via useEffect when user state updates
    } catch (err) {
      setError(err.message || 'Failed to create account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-primary-black-800 rounded-lg shadow-2xl p-8 border border-primary-black-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-black-50 mb-2">🏈 Fantasy League</h1>
          <p className="text-primary-black-300">Create your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 text-red-300 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-primary-black-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 text-primary-black-50 rounded-lg focus:ring-2 focus:ring-primary-green-500 focus:border-transparent placeholder-primary-black-500"
              placeholder="cool_username"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary-black-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 text-primary-black-50 rounded-lg focus:ring-2 focus:ring-primary-green-500 focus:border-transparent placeholder-primary-black-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary-black-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 text-primary-black-50 rounded-lg focus:ring-2 focus:ring-primary-green-500 focus:border-transparent placeholder-primary-black-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-black-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 text-primary-black-50 rounded-lg focus:ring-2 focus:ring-primary-green-500 focus:border-transparent placeholder-primary-black-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-green-500 text-primary-black-950 py-3 px-4 rounded-lg font-semibold hover:bg-primary-green-400 focus:outline-none focus:ring-2 focus:ring-primary-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-primary-black-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-green-400 hover:text-primary-green-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
