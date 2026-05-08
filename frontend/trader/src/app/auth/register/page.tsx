'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import AuthShell, { AuthTabs, AuthHeading, GoogleButton } from '@/components/auth/AuthShell';

const COUNTRIES = [
  'India', 'United Arab Emirates', 'Singapore', 'Malaysia', 'Thailand', 'Philippines',
  'Indonesia', 'Vietnam', 'South Africa', 'Nigeria', 'Kenya', 'Egypt',
  'Saudi Arabia', 'Qatar', 'Kuwait', 'Brazil', 'Mexico', 'Argentina',
  'Spain', 'Portugal', 'France', 'Germany', 'Italy', 'Netherlands',
];

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isLoading, isAuthenticated, isInitialized } = useAuthStore();

  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [showPartner, setShowPartner] = useState(false);
  const [tax, setTax] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && isAuthenticated) router.replace('/accounts');
  }, [isInitialized, isAuthenticated, router]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setPartnerCode(ref);
      setShowPartner(true);
    }
  }, [searchParams]);

  const passLen = password.length;
  const passUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const passNumber = /\d/.test(password);
  const passSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/]/.test(password);
  const passLenOk = passLen >= 8 && passLen <= 15;

  const passOk = passLenOk && passUpperLower && passNumber && passSpecial;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!country) {
      setErrorMsg('Please select your country / region of residence.');
      return;
    }
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!passOk) {
      setErrorMsg('Password does not meet all requirements.');
      return;
    }
    if (!tax) {
      setErrorMsg('You must confirm you are not a US citizen / resident for tax purposes.');
      return;
    }
    try {
      // Backend requires first_name / last_name; Exness UX collects only email.
      // We seed harmless placeholders that the user can update from Profile later.
      const handle = email.split('@')[0] || 'Trader';
      await register({
        email,
        password,
        first_name: handle.slice(0, 32) || 'Trader',
        last_name: 'User',
        phone: undefined,
        referral_code: partnerCode.trim() || undefined,
      });
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem('piphigh.country', country);
      } catch {
        /* ignore */
      }
      toast.success('Account created');
      router.replace('/accounts');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed');
    }
  };

  return (
    <AuthShell>
      <AuthHeading>Welcome to EX-Setup</AuthHeading>
      <AuthTabs active="register" />

      <form onSubmit={submit} className="space-y-5">
        <Field label="Country / Region of residence">
          <div className="relative">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full appearance-none px-3.5 py-3 pr-10 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] focus:outline-none focus:border-[#111827] transition-colors"
            >
              <option value=""></option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        <Field label="Your email address">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-3 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] focus:outline-none focus:border-[#111827] transition-colors"
          />
        </Field>

        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-3 pr-16 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] focus:outline-none focus:border-[#111827] transition-colors"
            />
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 tabular-nums">
              {passLen}
            </span>
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <ul className="mt-2 space-y-0.5 text-[13px]">
            <Rule ok={passLenOk}>Between 8-15 characters</Rule>
            <Rule ok={passUpperLower}>At least one upper and one lower case letter</Rule>
            <Rule ok={passNumber}>At least one number</Rule>
            <Rule ok={passSpecial}>At least one special character</Rule>
          </ul>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowPartner((v) => !v)}
            className="inline-flex items-center gap-1 text-[14px] text-[#111827] font-medium hover:underline"
          >
            Partner code (optional)
            <ChevronDown size={15} className={`transition-transform ${showPartner ? 'rotate-180' : ''}`} />
          </button>
          {showPartner && (
            <input
              type="text"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              placeholder="Enter partner / referral code"
              className="mt-2 w-full px-3.5 py-3 rounded-lg bg-white border border-gray-300 text-[15px] text-[#111827] focus:outline-none focus:border-[#111827] transition-colors"
            />
          )}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <span
            className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded border ${
              tax ? 'bg-[#111827] border-[#111827] text-white' : 'bg-white border-gray-300'
            }`}
          >
            {tax && <Check size={14} strokeWidth={3} />}
          </span>
          <input
            type="checkbox"
            checked={tax}
            onChange={(e) => setTax(e.target.checked)}
            className="sr-only"
          />
          <span className="text-[14px] text-[#111827] leading-snug">
            I declare and confirm that I am not a citizen or resident of the US for tax purposes.
          </span>
        </label>

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#ffe600] hover:bg-[#f5dc00] text-[15px] font-bold text-[#111827] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />} Register
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex-1 h-px bg-gray-200" />
          <span>Or create an account with</span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>

        <GoogleButton label="Google" />
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
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

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 leading-tight">
      <span
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
          ok ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-transparent'
        }`}
      >
        ✓
      </span>
      <span className={ok ? 'text-emerald-700' : 'text-gray-500'}>{children}</span>
    </li>
  );
}
