'use client';

import Link from 'next/link';
import { AlertCircle, Info } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';

export default function VpsPage() {
  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight mb-2">
          Virtual Private Server
        </h1>
        <p className="text-sm text-text-secondary mb-8 max-w-3xl">
          Virtual Private Servers allow you to run automated trading strategies with fast and reliable execution.{' '}
          <Link href="/support" className="text-accent hover:underline">Read more</Link>
        </p>

        <div className="bg-bg-primary border border-border-primary rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-[#fbf3e0] flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={16} className="text-[#caa53b]" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-text-primary leading-tight mb-1">
                You do not currently qualify for a free VPS
              </h2>
              <p className="text-sm text-text-secondary">
                To qualify for a free VPS, you need to meet one of the following criteria:
              </p>
            </div>
          </div>

          <Tier
            number={1}
            text={
              <>
                Your balance across all your trading accounts needs to be at least <strong>2,000 USD</strong> to immediately qualify for a free VPS.
                If your balance is between <strong>500–1,999 USD</strong>, you can still get a free VPS if you meet the trading volume requirements below.
              </>
            }
            label="Balance required:"
            value="2,000 USD"
            progressLabelLeft="0 USD"
            progressLabelRight="2,000 USD"
            progressFraction={0}
          />

          <div className="my-6 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-bg-base border border-border-primary text-xs font-semibold text-text-secondary">OR</span>
          </div>

          <Tier
            number={2}
            text={
              <>
                If your account balance is between <strong>500–1,999 USD</strong>, your total trading volume within the last 30 days needs to be equivalent to at least <strong>1,500,000 USD</strong>, in any currency or asset.
              </>
            }
            label="Balance required:"
            value="500 USD"
            secondLabel="Trading Volume required:"
            secondValue="1,500,000 USD"
            progressLabelLeft="0 USD"
            progressLabelMiddle="500 USD"
            progressLabelRight="2,000 USD"
            progressFraction={0}
            secondProgressLabelLeft="0 USD"
            secondProgressLabelRight="1,500,000 USD"
            secondProgressFraction={0}
          />

          <div className="mt-8 flex items-start gap-2 text-xs text-text-tertiary">
            <Info size={13} className="shrink-0 mt-0.5" />
            <p>
              VPS hosting eligibility is reviewed monthly based on your account activity. Once you qualify, the VPS will be provisioned automatically.
            </p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

interface TierProps {
  number: number;
  text: React.ReactNode;
  label: string;
  value: string;
  secondLabel?: string;
  secondValue?: string;
  progressLabelLeft: string;
  progressLabelMiddle?: string;
  progressLabelRight: string;
  progressFraction: number;
  secondProgressLabelLeft?: string;
  secondProgressLabelRight?: string;
  secondProgressFraction?: number;
}

function Tier(props: TierProps) {
  return (
    <div>
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-bg-base border border-border-primary flex items-center justify-center text-xs font-semibold text-text-primary shrink-0">
          {props.number}
        </div>
        <p className="text-sm text-text-primary leading-relaxed">{props.text}</p>
      </div>

      <div className="mt-4 ml-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm mb-2">
            <span className="text-text-secondary">{props.label}</span>{' '}
            <span className="font-semibold text-text-primary">{props.value}</span>
          </p>
          <Progress
            fraction={props.progressFraction}
            left={props.progressLabelLeft}
            middle={props.progressLabelMiddle}
            right={props.progressLabelRight}
          />
        </div>
        {props.secondLabel && (
          <div>
            <p className="text-sm mb-2">
              <span className="text-text-secondary">{props.secondLabel}</span>{' '}
              <span className="font-semibold text-text-primary">{props.secondValue}</span>
            </p>
            <Progress
              fraction={props.secondProgressFraction ?? 0}
              left={props.secondProgressLabelLeft ?? ''}
              right={props.secondProgressLabelRight ?? ''}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Progress({ fraction, left, middle, right }: { fraction: number; left: string; middle?: string; right: string }) {
  return (
    <div>
      <div className="h-1 w-full rounded-full bg-bg-base overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-text-tertiary mt-1.5 tabular-nums">
        <span>{left}</span>
        {middle && <span>{middle}</span>}
        <span>{right}</span>
      </div>
    </div>
  );
}
