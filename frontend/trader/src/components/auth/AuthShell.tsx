'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="light"
      className="theme-light auth-shell min-h-[100dvh] flex flex-col bg-white text-[#111827]"
    >
      {/* Header */}
      <header className="h-[60px] flex items-center justify-between px-4 sm:px-8 border-b border-gray-200 bg-white shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/ex-setup-mark.svg" alt="EX-Setup" className="w-7 h-7 object-contain" />
          <span className="font-bold tracking-tight text-xl text-[#111827]">EX-Setup</span>
        </Link>
        <button
          type="button"
          aria-label="Language"
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Globe size={18} strokeWidth={1.85} />
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 py-8 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 sm:px-12 py-10 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 text-[13px] text-gray-600">
          <div className="space-y-3 max-w-3xl leading-relaxed">
            <p>
              EX-Setup Limited is registered and regulated by the relevant Financial Services Commission. The
              registered office details are available upon request.
            </p>
            <p>This website is operated by EX-Setup Limited.</p>
            <p>The entity above is duly authorized to operate under the EX-Setup brand and trademarks.</p>
            <p>
              Risk Warning: Online Forex/CFDs are complex instruments and come with a high risk of losing
              money rapidly due to leverage. You should consider whether you understand how CFDs work and
              whether you can afford to take the high risk of losing your money. Under no circumstances
              shall EX-Setup have any liability to any person or entity for any loss or damage in whole or
              part caused by, resulting from, or relating to any financial activity.{' '}
              <Link href="/risk" className="text-[#1a6dff] hover:underline">Learn more</Link>
            </p>
            <p>
              The information on this website does not constitute investment advice or a recommendation or a
              solicitation to engage in any investment activity.
            </p>
            <p>
              The information on this website may only be copied with the express written permission of EX-Setup.
            </p>
          </div>

          <ul className="flex flex-col gap-2 text-[#1a6dff]">
            <li><Link href="/privacy" className="hover:underline">Privacy Agreement</Link></li>
            <li><Link href="/risk" className="hover:underline">Risk disclosure</Link></li>
            <li><Link href="/terms" className="hover:underline">Preventing money laundering</Link></li>
            <li><Link href="/terms" className="hover:underline">Security instructions</Link></li>
            <li><Link href="/terms" className="hover:underline">Legal documents</Link></li>
            <li><Link href="/support" className="hover:underline">Complaints Handling Policy</Link></li>
            <li className="pt-3 text-gray-500 hover:no-underline">© {new Date().getFullYear()} EX-Setup</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

export function AuthTabs({ active }: { active: 'signin' | 'register' }) {
  return (
    <div className="grid grid-cols-2 border-b border-gray-200 mb-7">
      <Link
        href="/auth/login"
        className={`text-center pb-3 text-[15px] font-semibold transition-colors ${
          active === 'signin'
            ? 'text-[#111827] border-b-2 border-[#111827] -mb-px'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        Sign in
      </Link>
      <Link
        href="/auth/register"
        className={`text-center pb-3 text-[15px] font-semibold transition-colors ${
          active === 'register'
            ? 'text-[#111827] border-b-2 border-[#111827] -mb-px'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        Create an account
      </Link>
    </div>
  );
}

export function AuthHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-center text-[#111827] mb-7">
      {children}
    </h1>
  );
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function GoogleButton({ label }: { label: string }) {
  const router = useRouter();
  const { googleLogin, isLoading } = useAuthStore();
  const scriptLoaded = useRef(false);
  const busyRef = useRef(false);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        await googleLogin(response.credential);
        router.replace('/accounts');
      } catch (err: any) {
        toast.error(err?.message || 'Google sign-in failed');
      } finally {
        busyRef.current = false;
      }
    },
    [googleLogin, router],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || scriptLoaded.current) return;
    scriptLoaded.current = true;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // cleanup not strictly required — Google script is idempotent
    };
  }, []);

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Google login is not configured. Add GOOGLE_CLIENT_ID to .env');
      return;
    }
    if (!window.google?.accounts?.id) {
      toast.error('Google script still loading — please try again');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
    window.google.accounts.id.prompt();
  };

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleClick}
      className="w-full inline-flex items-center justify-center gap-2.5 py-3 rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-gray-200 text-[14px] font-semibold text-[#111827] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.3 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.3 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.3 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.7 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C40.9 36.9 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/>
        </svg>
      )}
      {label}
    </button>
  );
}
