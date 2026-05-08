'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronDown, RefreshCcw, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  author: string;
  published_at: string | null;
  tags: string[];
}

const TAG_PILLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'DollarIndex',
  'Gold', 'Oil', 'Bitcoin', 'Fed', 'ECB', 'InterestRate', 'Inflation',
];

const PAGE_STEP = 12;

function fmtPublished(iso: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: 'GMT',
    }).replace(',', '') + ' GMT';
  } catch { return ''; }
}

export default function MarketNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  const fetchNews = useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '120' });
      if (force) params.set('refresh', 'true');
      if (activeTags.length) params.set('tags', activeTags.join(','));
      const res = await api.get<{ items: NewsItem[] }>(`/news?${params.toString()}`);
      setItems(Array.isArray(res?.items) ? res.items : []);
      setVisibleCount(PAGE_STEP);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTags]);

  useEffect(() => { void fetchNews(); }, [fetchNews]);

  const toggleTag = (t: string) => {
    setActiveTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  };

  const toggleExpand = (id: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  return (
    <DashboardShell mainClassName="p-0 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-bg-base">
        <div className="w-full max-w-[1100px] mx-auto px-3 sm:px-6 py-4 sm:py-10 pb-24">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
            <h1 className="text-[22px] sm:text-[34px] font-semibold text-text-primary tracking-tight">
              Market News
            </h1>
            <button
              type="button"
              onClick={() => fetchNews(true)}
              disabled={refreshing}
              className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover flex items-center justify-center disabled:opacity-50"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Tags pills */}
          <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-7 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            <span className="text-text-tertiary text-[12px] sm:text-sm shrink-0 pr-1">Tags:</span>
            {TAG_PILLS.map((t) => {
              const active = activeTags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={clsx(
                    'shrink-0 px-3 sm:px-4 py-1.5 rounded-full border text-[12px] sm:text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-text-primary text-bg-base border-text-primary'
                      : 'bg-bg-base border-border-primary text-text-primary hover:bg-bg-hover',
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-bg-secondary border border-border-primary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-primary bg-bg-secondary/40 py-16 text-center text-sm text-text-tertiary">
              No news available right now. Try refresh or remove some tag filters.
            </div>
          ) : (
            <ul className="divide-y divide-border-primary">
              {visible.map((n) => {
                const isOpen = expanded.has(n.id);
                return (
                  <li key={n.id} className="py-4 sm:py-5">
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-start gap-1.5 text-text-primary hover:text-warning transition-colors"
                    >
                      <h2 className="text-[15px] sm:text-[20px] font-bold tracking-tight leading-snug">
                        {n.title}
                      </h2>
                      <ExternalLink size={14} className="mt-1 sm:mt-1.5 text-text-tertiary group-hover:text-warning shrink-0" />
                    </a>

                    <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] sm:text-[13px] text-text-secondary">
                      <span className="font-semibold text-text-primary truncate max-w-[55%] sm:max-w-none">{n.author || n.source}</span>
                      <span className="text-text-tertiary">|</span>
                      <span>{fmtPublished(n.published_at)}</span>
                    </div>

                    {n.summary ? (
                      <p className={clsx(
                        'mt-2.5 sm:mt-3 text-[13px] sm:text-[14px] text-text-primary leading-relaxed',
                        !isOpen && 'line-clamp-2',
                      )}>
                        {n.summary}
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.tags.slice(0, 6).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTag(t)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide text-text-secondary bg-bg-secondary hover:bg-bg-hover border border-border-primary transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      {n.summary ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(n.id)}
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                          className="w-8 h-8 rounded-full border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-bg-hover flex items-center justify-center transition-colors"
                        >
                          <ChevronDown
                            size={16}
                            className={clsx('transition-transform', isOpen && 'rotate-180')}
                          />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_STEP)}
                className="px-6 py-2.5 rounded-lg border border-border-primary bg-bg-base text-text-primary text-sm font-semibold hover:bg-bg-hover transition-colors"
              >
                Load more news
              </button>
            </div>
          )}

          <p className="mt-12 text-[11px] text-text-tertiary leading-relaxed">
            Headlines aggregated from public market-news RSS feeds (FXStreet, ForexLive, Investing, DailyFX) via the
            EX-Setup gateway. Tags are auto-extracted from headlines and summaries; click a tag to filter, click
            again to remove. News is for informational purposes only and does not constitute investment advice.
          </p>
        </div>
        <LegalFooter />
      </div>
    </DashboardShell>
  );
}
