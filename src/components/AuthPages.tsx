import { useState } from 'react';
import { ArrowLeft, Loader2, Lock, Mail, Store, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { WorkspaceView } from '../types';

interface AuthPagesProps {
  mode: 'login' | 'register';
  onSwitchMode: (mode: 'login' | 'register') => void;
  onSuccess: () => void;
  onNavigatePublic: (view: WorkspaceView) => void;
}

export function AuthPages({
  mode,
  onSwitchMode,
  onSuccess,
  onNavigatePublic,
}: AuthPagesProps) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [forgotMode, setForgotMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [shopName, setShopName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSent(false);

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (forgotMode) {
        await resetPassword(email.trim());
        setResetSent(true);
      } else if (mode === 'login') {
        if (!password) {
          setError('Enter your password.');
          setSubmitting(false);
          return;
        }
        await signInWithEmail(email.trim(), password);
        onSuccess();
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        await registerWithEmail(email.trim(), password, displayName.trim(), shopName.trim());
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/80 via-slate-50 to-purple-50/70 dark:from-slate-950 dark:via-slate-950 dark:to-violet-950/20 flex flex-col justify-center px-4 py-10">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigatePublic('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-violet-600 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>

          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white inline-flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
              C
            </span>
            <span>CraftRank</span>
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl shadow-violet-950/5 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {forgotMode
                ? 'Reset Your Password'
                : mode === 'login'
                ? 'Sign In to CraftRank'
                : 'Create Your Free Account'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {forgotMode
                ? 'Enter your account email and we will send a password reset link.'
                : 'Access all 14 Etsy SEO tools, saved keywords, and shop history — 100% free forever.'}
            </p>
          </div>

          {!forgotMode && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 whitespace-nowrap">
                  or with email
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!forgotMode && mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Etsy Shop (Optional)
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="OakAndBrass"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seller@yourshop.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                />
              </div>
            </div>

            {!forgotMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setError(null);
                      }}
                      className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 leading-relaxed">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                Password reset email sent. Check your inbox and return here to sign in.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {forgotMode
                  ? 'Send Reset Email'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Free Account'}
              </span>
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
            {forgotMode ? (
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError(null);
                  setResetSent(false);
                }}
                className="font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                Return to Sign In
              </button>
            ) : mode === 'login' ? (
              <>
                New to CraftRank?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode('register');
                    setError(null);
                  }}
                  className="font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  Create a free account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode('login');
                    setError(null);
                  }}
                  className="font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  Sign in instead
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
