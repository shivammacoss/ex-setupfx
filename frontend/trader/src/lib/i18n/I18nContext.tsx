'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICTIONARIES, SUPPORTED_LANGUAGES, type LangCode } from './dictionary';

const STORAGE_KEY = 'piphigh.lang';

interface I18nContextValue {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  dir: 'ltr' | 'rtl';
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLang(): LangCode {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (saved && saved in DICTIONARIES) return saved;
  const nav = (window.navigator?.language || 'en').slice(0, 2).toLowerCase() as LangCode;
  return nav in DICTIONARIES ? nav : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  // Read initial value on client mount (avoid SSR mismatch)
  useEffect(() => {
    setLangState(getInitialLang());
  }, []);

  // Update <html lang> + dir whenever language changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.dir ?? 'ltr';
  }, [lang]);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const dir = useMemo(() => {
    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    return meta?.dir ?? 'ltr';
  }, [lang]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
      return dict[key] ?? DICTIONARIES.en[key] ?? fallback ?? key;
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, dir, t }), [lang, setLang, dir, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // graceful fallback so components don't crash if used outside provider
    return {
      lang: 'en',
      setLang: () => {},
      dir: 'ltr',
      t: (_k: string, fb?: string) => fb ?? _k,
    };
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
