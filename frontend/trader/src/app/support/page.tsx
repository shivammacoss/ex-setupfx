'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Search,
  AlertCircle,
  ChevronDown,
  Phone,
  X,
  MessageCircle,
  Plus,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface Message {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  message_count?: number;
  created_at: string;
  messages?: Message[];
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  messages: Message[];
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'pending', label: 'Pending' },
  { id: 'closed', label: 'Closed' },
];

const CATEGORIES = ['Trading', 'Account', 'Deposits', 'Withdrawals', 'Technical', 'Other'];

const SUPPORT_PHONE = '+1 (800) 320-0418';

function fmtDate(s: string) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return s;
  }
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusOpen, setStatusOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [helpQuery, setHelpQuery] = useState('');
  const statusRef = useRef<HTMLDivElement>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items?: Ticket[] } | Ticket[]>('/support/tickets');
      const items = Array.isArray(res) ? res : res?.items ?? [];
      setTickets(items);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!statusOpen) return;
    const onDown = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [statusOpen]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (statusFilter !== 'all') {
      list = list.filter((t) => (t.status || '').toLowerCase() === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.subject?.toLowerCase().includes(q));
    }
    return list;
  }, [tickets, statusFilter, search]);

  const submitNew = async () => {
    if (!newSubject.trim() || !newDescription.trim()) {
      toast.error('Please fill in the subject and description');
      return;
    }
    setCreating(true);
    try {
      await api.post('/support/tickets', {
        subject: newSubject.trim(),
        category: newCategory,
        description: newDescription.trim(),
      });
      toast.success('Ticket submitted');
      setNewOpen(false);
      setNewSubject('');
      setNewCategory(CATEGORIES[0]);
      setNewDescription('');
      void fetchTickets();
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit ticket');
    } finally {
      setCreating(false);
    }
  };

  const openTicket = async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get<TicketDetail>(`/support/tickets/${id}`);
      setDetail(res);
    } catch {
      toast.error('Could not load ticket');
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/support/tickets/${detail.id}/reply`, { message: reply.trim() });
      setReply('');
      const updated = await api.get<TicketDetail>(`/support/tickets/${detail.id}`);
      setDetail(updated);
      void fetchTickets();
    } catch (e: any) {
      toast.error(e?.message || 'Could not send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardShell>
      <div className="pb-12 sm:pb-16">
        <h1 className="text-[22px] sm:text-[34px] font-semibold text-text-primary tracking-tight mb-4 sm:mb-6">
          Support hub
        </h1>

        {/* Help search */}
        <div className="bg-bg-base border border-border-primary rounded-2xl p-4 sm:p-7 mb-6 sm:mb-10">
          <h2 className="text-[17px] sm:text-[22px] font-semibold text-text-primary mb-1">
            How can we help you?
          </h2>
          <p className="text-[12px] sm:text-sm text-text-secondary mb-4 sm:mb-5">
            Your one-stop solution for all your needs. Find answers, troubleshoot issues, and explore guides.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!helpQuery.trim()) return;
              setNewSubject(helpQuery.trim());
              setNewOpen(true);
            }}
            className="relative"
          >
            <input
              type="text"
              value={helpQuery}
              onChange={(e) => setHelpQuery(e.target.value)}
              placeholder="Please enter your question or keyword..."
              className="w-full pl-4 pr-14 py-3.5 rounded-lg bg-bg-primary border border-border-primary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-[#ffe600] hover:bg-[#f5dc00] flex items-center justify-center text-text-primary transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </form>
        </div>

        {/* Contact us */}
        <h2 className="text-[18px] sm:text-[28px] font-semibold text-text-primary tracking-tight mb-4 sm:mb-5">
          Contact us
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 mb-8 sm:mb-12">
          <ContactCard
            illustration="ticket"
            title="Need assistance?"
            description="Complete the form and we will get back to you shortly."
            cta={
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] transition-colors"
              >
                <Plus size={14} strokeWidth={2.4} /> Open a ticket
              </button>
            }
          />

          <ContactCard
            illustration="chat"
            title="Live chat"
            description="Can't find the answers you're looking for? Chat with our Intelligent Assistant."
            cta={
              <button
                type="button"
                onClick={() => toast('Live chat will open in a moment')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
              >
                <MessageCircle size={14} /> Start chat
              </button>
            }
          />

          <ContactCard
            illustration="phone"
            title="Still need help?"
            description="To speak with our support team, please call:"
            cta={
              <a
                href={`tel:${SUPPORT_PHONE.replace(/[^+\d]/g, '')}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
              >
                <Phone size={13} /> {SUPPORT_PHONE}
              </a>
            }
          />
        </div>

        {/* My tickets */}
        <h2 className="text-[18px] sm:text-[28px] font-semibold text-text-primary tracking-tight mb-4 sm:mb-5">
          My tickets
        </h2>

        <div className="bg-bg-primary border border-border-primary rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-border-primary">
            <div className="relative" ref={statusRef}>
              <button
                type="button"
                onClick={() => setStatusOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-bg-base border border-border-primary text-[12px] sm:text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors"
              >
                <span className="truncate max-w-[180px]">Status: {STATUS_FILTERS.find((s) => s.id === statusFilter)?.label ?? 'All'}</span>
                <ChevronDown size={14} />
              </button>
              {statusOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-bg-primary border border-border-primary rounded-lg py-1 z-10 shadow-lg">
                  {STATUS_FILTERS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(s.id);
                        setStatusOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-bg-hover ${
                        statusFilter === s.id ? 'text-accent font-semibold' : 'text-text-primary'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-full bg-bg-base border border-border-primary text-[12px] sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-text-tertiary">Loading tickets…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center mb-3">
                <AlertCircle size={20} className="text-text-tertiary" />
              </div>
              <p className="text-[15px] font-semibold text-text-primary">You don&apos;t have any tickets</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-primary">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void openTicket(t.id)}
                    className="w-full text-left px-3 sm:px-5 py-3 sm:py-4 hover:bg-bg-hover transition-colors flex items-center justify-between gap-2 sm:gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] sm:text-sm font-semibold text-text-primary truncate">{t.subject}</p>
                      <p className="text-[11px] sm:text-xs text-text-tertiary mt-0.5">
                        Opened {fmtDate(t.created_at)} · {t.message_count ?? 0} msgs
                      </p>
                    </div>
                    <StatusPill status={t.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legal footer */}
        <div className="mt-12 pt-8 border-t border-border-primary grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 text-xs text-text-tertiary">
          <p className="leading-relaxed max-w-3xl">
            The information on this website may only be copied with the express written permission of StockPip.
            General Risk Warning: CFDs are leveraged products. Trading in CFDs carries a high level of risk
            thus may not be appropriate for all investors. The investment value can both increase and decrease
            and the investors may lose all their invested capital.
          </p>
          <ul className="flex flex-col gap-1.5 text-accent">
            <li><Link href="/terms" className="hover:underline">Client Agreement</Link></li>
            <li><Link href="/terms" className="hover:underline">General Business Terms</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
            <li><Link href="/risk" className="hover:underline">Risk Disclosure</Link></li>
          </ul>
        </div>
      </div>
      <LegalFooter />

      {/* New ticket modal */}
      {newOpen && (
        <ModalShell title="Open a new ticket" onClose={() => setNewOpen(false)}>
          <div className="space-y-4">
            <Field label="Subject">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                placeholder="Briefly describe your issue"
              />
            </Field>
            <Field label="Category">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={5}
                className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                placeholder="Provide as much detail as possible…"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void submitNew()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] disabled:opacity-50 transition-colors"
              >
                {creating ? 'Submitting…' : 'Submit ticket'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Ticket detail modal */}
      {detailOpen && (
        <ModalShell
          title={detail?.subject ?? 'Ticket'}
          onClose={() => {
            setDetailOpen(false);
            setDetail(null);
            setReply('');
          }}
        >
          {detailLoading ? (
            <p className="text-sm text-text-tertiary py-6 text-center">Loading…</p>
          ) : detail ? (
            <div className="space-y-4">
              <StatusPill status={detail.status} />
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {detail.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg text-sm ${
                      m.is_admin
                        ? 'bg-bg-base border border-border-primary'
                        : 'bg-accent/10 border border-accent/20'
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase text-text-tertiary mb-1">
                      {m.is_admin ? 'Support' : 'You'} · {fmtDate(m.created_at)}
                    </p>
                    <p className="text-text-primary whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))}
                {(!detail.messages || detail.messages.length === 0) && (
                  <p className="text-sm text-text-tertiary text-center py-4">No messages yet.</p>
                )}
              </div>
              <div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Type a reply…"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={sending || !reply.trim()}
                    className="px-5 py-2 rounded-lg text-sm font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] disabled:opacity-50 transition-colors"
                  >
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary py-6 text-center">Could not load ticket.</p>
          )}
        </ModalShell>
      )}
    </DashboardShell>
  );
}

/* ─── Bits ─── */

function ContactCard({
  illustration,
  title,
  description,
  cta,
}: {
  illustration: 'ticket' | 'chat' | 'phone';
  title: string;
  description: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="bg-bg-primary border border-border-primary rounded-xl overflow-hidden flex flex-col">
      <div className="bg-bg-base border-b border-border-primary h-24 flex items-center justify-center">
        <Illustration kind={illustration} />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-[15px] font-semibold text-text-primary mb-1">{title}</h3>
        <p className="text-[12px] text-text-secondary mb-3 flex-1 leading-snug">{description}</p>
        {cta}
      </div>
    </div>
  );
}

function Illustration({ kind }: { kind: 'ticket' | 'chat' | 'phone' }) {
  if (kind === 'ticket') {
    return (
      <svg viewBox="0 0 200 150" className="w-auto h-full p-2">
        <defs>
          <linearGradient id="g-ticket" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
        <path d="M40,60 L80,60 a10,10 0 0 1 0,20 L40,80 a10,10 0 0 1 0,-20 z" fill="url(#g-ticket)" />
        <circle cx="120" cy="75" r="22" fill="url(#g-ticket)" />
        <circle cx="135" cy="105" r="6" fill="url(#g-ticket)" />
      </svg>
    );
  }
  if (kind === 'chat') {
    return (
      <svg viewBox="0 0 200 150" className="w-auto h-full p-2">
        <defs>
          <linearGradient id="g-chat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="75" r="30" fill="url(#g-chat)" />
        <circle cx="100" cy="75" r="10" fill="white" />
        <circle cx="60" cy="50" r="8" fill="url(#g-chat)" />
        <circle cx="150" cy="100" r="6" fill="url(#g-chat)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full p-6">
      <defs>
        <linearGradient id="g-phone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect x="80" y="20" width="60" height="110" rx="8" fill="url(#g-phone)" />
      <rect x="86" y="30" width="48" height="80" rx="2" fill="white" />
      <rect x="100" y="42" width="20" height="3" fill="#cbd5e1" />
      <rect x="100" y="50" width="20" height="3" fill="#cbd5e1" />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const tone =
    s === 'closed'
      ? 'bg-gray-100 text-gray-600'
      : s === 'pending'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-emerald-50 text-emerald-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${tone}`}>
      {status || 'open'}
    </span>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Lock body scroll while open + close on Escape
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-bg-primary rounded-2xl border border-border-primary shadow-2xl overflow-hidden my-auto"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
            <h3 className="text-[16px] font-semibold text-text-primary truncate pr-3">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-hover"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}
