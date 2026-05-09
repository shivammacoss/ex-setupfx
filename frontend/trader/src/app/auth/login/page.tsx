'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import AuthShell, { AuthTabs, AuthHeading, GoogleButton } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const { login, forgotPassword, isLoading, isAuthenticated, isInitialized } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);

  useEffect(() => {
    if (isInitialized && isAuthenticated) router.replace('/accounts');
  }, [isInitialized, isAuthenticated, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 1) {
      setErrorMsg('Please enter your password.');
      return;
    }
    try {
      await login(email, password, totpCode || undefined);
      router.replace('/accounts');
    } catch (err: any) {
      const raw = String(err?.message || err || '');
      if (raw.toLowerCase().includes('totp') || raw.toLowerCase().includes('2fa')) {
        setNeedsTotp(true);
        setErrorMsg('Enter your 2FA code to continue.');
        return;
      }
      setErrorMsg(raw || 'The email or password you entered is incorrect.');
    }
  };

  const submitForgot = async () => {
    if (!forgotEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    setForgotBusy(true);
    try {
      await forgotPassword(forgotEmail.trim());
      toast.success('Check your email for reset instructions.');
      setForgotOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send reset email');
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeading>Welcome to StockPip</AuthHeading>
      <AuthTabs active="signin" />

      <form onSubmit={submit} className="space-y-5">
        <Field label="Your email address">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-3 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] focus:outline-none focus:border-[#111827] transition-colors"
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-3 pr-11 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] focus:outline-none focus:border-[#111827] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        {needsTotp && (
          <Field label="Two-factor authentication code">
            <input
              type="text"
              inputMode="numeric"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3.5 py-3 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] tabular-nums focus:outline-none focus:border-[#111827] transition-colors"
            />
          </Field>
        )}

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#ffe600] hover:bg-[#f5dc00] text-[15px] font-bold text-[#111827] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />} Sign in
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex-1 h-px bg-gray-200" />
          <span>Or sign in with</span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>

        <GoogleButton label="Google" />

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setForgotOpen(true);
            }}
            className="text-[14px] text-[#1a6dff] hover:underline"
          >
            I forgot my password
          </button>
        </div>
      </form>

      {forgotOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-[#111827]">Reset your password</h3>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="text-gray-500 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Enter the email associated with your account and we&apos;ll send you a reset link.
              </p>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-3 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] focus:outline-none focus:border-[#111827]"
              />
              <button
                type="button"
                disabled={forgotBusy}
                onClick={() => void submitForgot()}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#ffe600] hover:bg-[#f5dc00] text-[14px] font-bold text-[#111827] disabled:opacity-50 transition-colors"
              >
                {forgotBusy ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
