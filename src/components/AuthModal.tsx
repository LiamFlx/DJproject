import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth'; 

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange
}) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null); 
    setSuccess(null);

    try {
      if (showResetPassword) {
        const { error } = await resetPassword(email);
        if (error) throw error; 
        setSuccess('Password reset email sent! Check your inbox.');
        setShowResetPassword(false);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, {
          username,
          display_name: username,
        });
        if (error) throw error; 
        setSuccess('Account created! Check your email to verify your account.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error; 
        onClose();
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setError(null);
    setSuccess(null);
    setShowResetPassword(false);
  };

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    resetForm();
    onModeChange(newMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-md animate-fade-in border border-purple-500/30 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
              <User className="text-white" size={16} />
            </div>
            {showResetPassword ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 animate-fade-in">
            <AlertCircle className="text-red-400" size={16} />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-xl flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-400" size={16} />
            <span className="text-green-300 text-sm">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && !showResetPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {!showResetPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-xl hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-glow"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : showResetPassword ? (
              'Send Reset Email'
            ) : mode === 'signup' ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {!showResetPassword && mode === 'signin' && (
            <button
              onClick={() => setShowResetPassword(true)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors hover:underline"
            >
              Forgot your password?
            </button>
          )}

          {showResetPassword ? (
            <button
              onClick={() => setShowResetPassword(false)}
              className="text-sm text-gray-400 hover:text-white transition-colors hover:underline"
            >
              Back to sign in
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-400">
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button
                onClick={() => handleModeSwitch(mode === 'signup' ? 'signin' : 'signup')}
                className="text-purple-400 hover:text-purple-300 transition-colors font-medium hover:underline"
              >
                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <p className="text-xs text-gray-500 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            <br />Your data is encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  );
};