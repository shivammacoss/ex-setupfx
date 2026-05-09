'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  Lock, Mail, Loader2, AlertCircle, Eye, EyeOff,
  ShieldCheck, Activity, Globe, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuthRehydrated } from '@/hooks/useAuthRehydrated';

export default function LoginPage() {
  const router = useRouter();
  const { login, checkAuth } = useAuthStore();
  const authRehydrated = useAuthRehydrated();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authRehydrated) return;
    if (checkAuth()) router.replace('/dashboard');
  }, [authRehydrated, checkAuth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authRehydrated) {
    return (
      <div className="relative min-h-screen bg-bg-page flex items-center justify-center p-4">
        <Loader2 size={24} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-page overflow-hidden">
      {/* Ambient backdrop — radial neon green glow + subtle grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(0,230,118,0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(0,200,83,0.25) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(var(--c-text-primary)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-text-primary)) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden glass-card shadow-2xl">
          {/* Brand panel */}
          <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-bg-secondary via-bg-card to-bg-tertiary border-r border-border-primary/40 overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 30% 20%, rgba(0,230,118,0.18) 0%, transparent 55%)',
              }}
            />

            <div className="relative">
              <div className="inline-flex items-center gap-2.5">
                <span className="relative inline-flex items-center justify-center w-11 h-11 shadow-lg">
                  <img src="/stockpip-mark.svg" alt="StockPip" className="w-11 h-11 rounded-xl" />
                  <span
                    className="absolute -inset-px rounded-xl pointer-events-none"
                    style={{ boxShadow: '0 0 24px rgba(0,230,118,0.25)' }}
                  />
                </span>
                <span className="font-bold tracking-tight text-lg select-none text-text-primary">
                  StockPip
                </span>
              </div>

              <div className="mt-12 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-semibold tracking-wider uppercase rounded-full bg-buy/10 text-buy border border-buy/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
                  Admin Console
                </span>
                <h2 className="text-3xl font-bold text-text-primary leading-tight">
                  Run the entire <br />
                  brokerage from <br />
                  <span style={{ color: '#00e676' }}>one cockpit.</span>
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
                  Trades, deposits, KYC, IB programs, risk &amp; analytics — every
                  surface of the platform, built for operators.
                </p>
              </div>
            </div>

            {/* Feature pills */}
            <div className="relative grid grid-cols-3 gap-3 mt-10">
              {[
                { icon: ShieldCheck, label: 'Secure Access' },
                { icon: Activity, label: 'Live Trading' },
                { icon: Globe, label: '24×5 Markets' },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col items-start gap-2 p-3 rounded-lg bg-bg-primary/40 border border-border-primary/40"
                >
                  <f.icon size={16} className="text-buy" />
                  <span className="text-xxs font-medium text-text-secondary leading-tight">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form panel */}
          <div className="relative bg-bg-secondary/80 backdrop-blur-xl p-6 sm:p-10 flex flex-col justify-center">
            {/* Mobile branding */}
            <div className="flex lg:hidden items-center justify-center mb-8">
              <div className="inline-flex items-center gap-2.5">
                <img src="/stockpip-mark.svg" alt="StockPip" className="w-10 h-10 rounded-xl" />
                <span className="font-bold tracking-tight text-base text-text-primary">
                  StockPip
                </span>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
              <p className="text-sm text-text-tertiary mt-1.5">
                Sign in to access the admin panel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary font-medium">Email</label>
                <div className="relative group">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-buy transition-fast"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@stockpip.com"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-bg-input border border-border-primary rounded-lg focus:border-buy transition-fast"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-text-secondary font-medium">Password</label>
                </div>
                <div className="relative group">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-buy transition-fast pointer-events-none"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 text-sm bg-bg-input border border-border-primary rounded-lg focus:border-buy transition-fast"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-fast"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-sell bg-sell/10 border border-sell/20 rounded-lg px-3 py-2.5 animate-slide-up">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'group w-full py-2.5 text-sm font-semibold rounded-lg transition-all relative overflow-hidden',
                  'skeu-btn-accent disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none',
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border-primary/50">
              <div className="flex items-center justify-center gap-1.5 text-xxs text-text-tertiary">
                <ShieldCheck size={11} className="text-buy/70" />
                <span>Secure access &middot; StockPip Admin v1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
