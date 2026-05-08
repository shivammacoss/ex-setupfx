'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext';
import { SUPPORTED_LANGUAGES, type LangCode } from '@/lib/i18n/dictionary';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const select = (code: LangCode) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        aria-label={t('language.change')}
        title={t('language.change')}
      >
        <Globe size={18} strokeWidth={1.85} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border-primary rounded-xl py-1 z-50 shadow-xl max-h-[60vh] overflow-y-auto">
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => select(l.code)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-bg-hover ${
                  active ? 'text-warning font-semibold' : 'text-text-primary'
                }`}
              >
                <span>{l.label}</span>
                {active && <Check size={15} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
