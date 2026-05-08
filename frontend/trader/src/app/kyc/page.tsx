'use client';

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  ChevronDown,
  Camera,
  MapPin,
  X,
} from 'lucide-react';

interface KycDocument {
  id: string;
  document_type: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface Profile {
  kyc_status: string;
  kyc_documents: KycDocument[];
  country?: string;
  address?: string | null;
}

const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'id_front', label: 'ID Front' },
  { value: 'id_back', label: 'ID Back' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'selfie', label: 'Selfie with ID' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'other', label: 'Other' },
] as const;

function normalizeKycStatus(raw: string) {
  return (raw || '').toLowerCase().trim();
}

function StatusBadge({ status, kind = 'user' }: { status: string; kind?: 'user' | 'document' }) {
  const s = normalizeKycStatus(status);
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border';
  if (s === 'pending' && kind === 'document') {
    return (
      <span className={`${base} bg-amber-50 border-amber-200 text-amber-700`}>
        <Clock size={11} strokeWidth={2.5} /> Pending
      </span>
    );
  }
  if (s === 'verified' || s === 'approved') {
    return (
      <span className={`${base} bg-green-50 border-green-200 text-green-700`}>
        <CheckCircle2 size={11} strokeWidth={2.5} /> Approved
      </span>
    );
  }
  if (s === 'submitted' || s === 'under_review') {
    return (
      <span className={`${base} bg-amber-50 border-amber-200 text-amber-700`}>
        <Clock size={11} strokeWidth={2.5} /> Under review
      </span>
    );
  }
  if (s === 'rejected' || s === 'failed') {
    return (
      <span className={`${base} bg-red-50 border-red-200 text-red-700`}>
        <XCircle size={11} strokeWidth={2.5} /> Rejected
      </span>
    );
  }
  return (
    <span className={`${base} bg-gray-50 border-gray-200 text-gray-700`}>
      <Clock size={11} strokeWidth={2.5} /> Not started
    </span>
  );
}

export default function KycPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);

  const [docType, setDocType] = useState('passport');
  const [file, setFile] = useState<File | null>(null);
  const [docType2, setDocType2] = useState('proof_of_address');
  const [file2, setFile2] = useState<File | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Profile>('/profile');
      setProfile(data);
      setCountry(data.country ?? '');
      setAddress((data.address ?? '').trim());
    } catch {
      toast.error('Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const kycStatus = normalizeKycStatus(profile?.kyc_status ?? '');
  const isVerified = kycStatus === 'verified' || kycStatus === 'approved';
  const isReview = kycStatus === 'submitted' || kycStatus === 'under_review';
  const isRejected = kycStatus === 'rejected' || kycStatus === 'failed';
  const isNotStarted = !isVerified && !isReview && !isRejected;
  const canSubmit = !isVerified && !isReview;

  const openForm = () => {
    setFile(null);
    setFile2(null);
    setShowFormModal(true);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a primary document');
      return;
    }
    const fd = new FormData();
    fd.append('document_type', docType);
    fd.append('file', file);
    if (file2) {
      fd.append('document_type_2', docType2);
      fd.append('file_2', file2);
    }
    if (address.trim()) fd.append('residential_address', address.trim());
    if (city.trim()) fd.append('city', city.trim());
    if (postal.trim()) fd.append('postal_code', postal.trim());
    if (country.trim()) fd.append('country_of_residence', country.trim());

    setSubmitting(true);
    try {
      const token = api.getToken();
      const res = await fetch('/api/v1/profile/kyc/submit/', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const raw = await res.text();
      let json: { detail?: unknown } = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        const d = json.detail;
        throw new Error(
          typeof d === 'string'
            ? d
            : Array.isArray(d)
              ? d.map((x: { msg?: string }) => x.msg).join(', ')
              : `Submit failed (${res.status})`,
        );
      }
      toast.success('KYC submitted — our team will review within 1–2 business days');
      setShowFormModal(false);
      void fetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full bg-bg-primary border border-border-primary rounded-lg px-3.5 py-2.5 text-text-primary text-[14px] outline-none focus:border-text-primary transition-colors placeholder:text-text-tertiary';
  const selectCls = `${inputCls} appearance-none cursor-pointer pr-10`;

  if (loading) {
    return (
      <DashboardShell>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-12 text-sm text-text-tertiary text-center">
          Loading…
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Page title */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-semibold text-text-primary tracking-tight">
              KYC Verification
            </h1>
            <p className="text-[13.5px] text-text-tertiary mt-1 max-w-2xl">
              Complete identity verification to unlock deposits, withdrawals, and live trading on EX-Setup.
            </p>
          </div>
          <StatusBadge status={profile?.kyc_status ?? ''} />
        </div>

        {/* Approved */}
        {isVerified && (
          <div className="rounded-2xl border border-border-primary bg-bg-primary p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={2} />
            </div>
            <h2 className="text-[18px] font-semibold text-text-primary mt-4">Identity verified</h2>
            <p className="text-[13.5px] text-text-tertiary mt-2 max-w-md mx-auto leading-relaxed">
              Your account is fully verified. You can deposit, withdraw, and use all live trading features.
            </p>
          </div>
        )}

        {/* Under review */}
        {isReview && (
          <div className="rounded-2xl border border-border-primary bg-bg-primary p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-amber-700" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-semibold text-text-primary">Documents under review</h2>
                <p className="text-[13.5px] text-text-tertiary mt-1.5 leading-relaxed">
                  Our team is reviewing your documents. This usually takes <span className="text-text-primary font-medium">24–48 hours</span>. You&apos;ll get a notification when the decision is ready.
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4 overflow-hidden">
                  <div className="bg-text-primary h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejected reason banner */}
        {isRejected && profile?.kyc_documents?.some((d) => d.rejection_reason) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
            <p className="text-[12px] font-semibold text-red-700 uppercase tracking-wide mb-1">
              Rejection reason
            </p>
            {profile.kyc_documents
              .filter((d) => d.rejection_reason)
              .map((d) => (
                <p key={d.id} className="text-[13.5px] text-red-900/80 leading-snug">
                  {d.rejection_reason}
                </p>
              ))}
          </div>
        )}

        {/* Start / Re-submit CTA */}
        {(isNotStarted || isRejected) && (
          <div className="rounded-2xl border border-border-primary bg-bg-primary overflow-hidden">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              <div className="w-14 h-14 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={26} className="text-text-primary" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-semibold text-text-primary">
                  {isRejected ? 'Re-submit your documents' : 'Start identity verification'}
                </h2>
                <p className="text-[13.5px] text-text-tertiary mt-1 leading-relaxed">
                  Upload a government ID and (optionally) proof of address. Most accounts are reviewed within 1–2 business days.
                </p>
              </div>
              <button
                type="button"
                onClick={openForm}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#ffe600] hover:bg-[#f5dc00] text-[14px] font-bold text-[#111827] transition-colors"
              >
                {isRejected ? 'Re-submit KYC' : 'Start verification'}
              </button>
            </div>
          </div>
        )}

        {/* What you'll need */}
        {(isNotStarted || isRejected) && (
          <div className="rounded-2xl border border-border-primary bg-bg-primary p-5 sm:p-6">
            <h3 className="text-[14px] font-semibold text-text-primary mb-4">What you&apos;ll need</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { num: '1', title: 'Government ID', desc: "Passport, driver's license, or national ID card.", Icon: FileText },
                { num: '2', title: 'Selfie photo', desc: 'A live photo for identity matching.', Icon: Camera },
                { num: '3', title: 'Proof of address', desc: 'Utility bill or bank statement (last 3 months).', Icon: MapPin },
              ].map(({ num, title, desc, Icon }) => (
                <div key={num} className="rounded-xl border border-border-primary bg-bg-secondary/40 p-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-7 h-7 rounded-full bg-bg-primary border border-border-primary flex items-center justify-center text-[12px] font-bold text-text-primary">
                      {num}
                    </span>
                    <Icon size={16} className="text-text-secondary" />
                  </div>
                  <p className="text-[14px] font-semibold text-text-primary">{title}</p>
                  <p className="text-[12.5px] text-text-tertiary mt-1 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why verify */}
        {(isNotStarted || isRejected) && (
          <div className="rounded-2xl border border-border-primary bg-bg-primary p-5 sm:p-6">
            <h3 className="text-[14px] font-semibold text-text-primary mb-4">Why verify?</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'Access live trading accounts',
                'Deposit and withdraw funds',
                'Higher transaction limits',
                'Join the affiliate program',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-border-primary bg-bg-secondary/40"
                >
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" strokeWidth={2.4} />
                  <span className="text-[13.5px] text-text-primary">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submitted documents */}
        {(profile?.kyc_documents?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-border-primary bg-bg-primary overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border-primary">
              <h3 className="text-[14px] font-semibold text-text-primary">Submitted documents</h3>
            </div>
            <ul className="divide-y divide-border-primary">
              {profile!.kyc_documents.map((doc) => (
                <li key={doc.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={15} className="text-text-tertiary shrink-0" />
                    <span className="text-[13.5px] text-text-primary capitalize truncate">
                      {doc.document_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={doc.status} kind="document" />
                    <span className="text-[11.5px] text-text-tertiary tabular-nums">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <LegalFooter />

      {/* Modal: submit form */}
      {showFormModal && canSubmit && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kyc-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => !submitting && setShowFormModal(false)}
          />
          <div className="relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-primary bg-bg-primary shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-border-primary bg-bg-primary">
              <h3 id="kyc-modal-title" className="text-[16px] font-semibold text-text-primary">
                {isRejected ? 'Re-submit documents' : 'Submit documents'}
              </h3>
              <button
                type="button"
                onClick={() => !submitting && setShowFormModal(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Primary doc */}
              <div className="space-y-2.5">
                <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wide">
                  Primary document <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className={selectCls}
                  >
                    {DOC_TYPES.slice(0, 6).map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
                  />
                </div>
                <UploadBox file={file} onChange={setFile} />
              </div>

              {/* Secondary doc */}
              <div className="space-y-2.5">
                <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wide">
                  Secondary document (optional)
                </label>
                <div className="relative">
                  <select
                    value={docType2}
                    onChange={(e) => setDocType2(e.target.value)}
                    className={selectCls}
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
                  />
                </div>
                <UploadBox file={file2} onChange={setFile2} small />
              </div>

              {/* Address */}
              <div className="space-y-2.5">
                <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wide">
                  Address (optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Residential address"
                  className={inputCls}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                    placeholder="Postal / ZIP"
                    className={inputCls}
                  />
                </div>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !submitting && setShowFormModal(false)}
                  className="sm:w-auto w-full px-5 py-3 rounded-lg border border-border-primary bg-bg-primary hover:bg-bg-hover text-[14px] font-semibold text-text-primary transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="sm:flex-1 w-full px-5 py-3 rounded-lg bg-[#ffe600] hover:bg-[#f5dc00] disabled:opacity-60 disabled:cursor-not-allowed text-[14px] font-bold text-[#111827] transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? 'Uploading…' : 'Submit for review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function UploadBox({
  file,
  onChange,
  small = false,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  small?: boolean;
}) {
  return (
    <label
      className={clsx(
        'flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors px-3 text-center',
        small ? 'min-h-[4rem]' : 'min-h-[5.5rem]',
        file
          ? 'border-text-primary/30 bg-bg-secondary/40'
          : 'border-border-primary hover:border-text-primary/40 bg-bg-secondary/30',
      )}
    >
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,.webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <span className="text-[13px] text-text-primary font-medium break-all py-2">{file.name}</span>
      ) : (
        <div className="flex flex-col items-center gap-1 py-2">
          <Upload size={18} className="text-text-tertiary" />
          <span className="text-[12.5px] text-text-tertiary">
            Tap to upload · JPG, PNG, PDF, WEBP · max 10 MB
          </span>
        </div>
      )}
    </label>
  );
}
