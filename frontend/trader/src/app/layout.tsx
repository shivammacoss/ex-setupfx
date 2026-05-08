import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { AuthProvider } from '@/components/providers/AuthProvider';
import NotificationListener from '@/components/NotificationListener';
import TopLoader from '@/components/TopLoader';
import { I18nProvider } from '@/lib/i18n/I18nContext';

export const metadata: Metadata = {
  title: 'EX-Setup',
  description: 'EX-Setup — professional forex and CFD trading platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var L='piphigh-ui',N='piphigh-ui';var o=localStorage.getItem(L),n=localStorage.getItem(N);if(o&&!n){localStorage.setItem(N,o);localStorage.removeItem(L);}var s=localStorage.getItem(N);var t='light';if(s){var j=JSON.parse(s);t=(j&&j.state&&j.state.theme)||(j&&j.theme)||'light';}var d=document.documentElement;d.setAttribute('data-theme',t);d.classList.add(t==='light'?'theme-light':'theme-dark');if(t==='light'){d.style.backgroundColor='#ffffff';d.style.color='#111827';}else{d.style.backgroundColor='#0a0a0a';d.style.color='#ffffff';}}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.backgroundColor='#ffffff';document.documentElement.style.color='#111827';}})();`,
          }}
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <NotificationListener />
              {children}
            <Suspense fallback={null}>
              <MobileBottomNav />
            </Suspense>
            <Toaster
              position="top-center"
              containerClassName="piphigh-toaster"
              toastOptions={{
                duration: 1500,
                className: 'piphigh-hot-toast',
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-fg)',
                  border: '1px solid var(--toast-border)',
                  fontSize: '13px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                },
                success: {
                  duration: 1500,
                  className: 'piphigh-hot-toast',
                  iconTheme: { primary: '#00d048', secondary: 'var(--toast-bg)' },
                },
                error: {
                  duration: 2500,
                  className: 'piphigh-hot-toast',
                  iconTheme: { primary: '#f87171', secondary: 'var(--toast-bg)' },
                },
                loading: { className: 'piphigh-hot-toast' },
              }}
            />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
