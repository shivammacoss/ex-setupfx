'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

export default function HelpButton() {
  return (
    <Link
      href="/support"
      className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
      aria-label="Help"
    >
      <HelpCircle size={18} strokeWidth={1.85} />
    </Link>
  );
}
