import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  href?: string;
  className?: string;
  /** Applied to the wordmark text (e.g. responsive sizes). */
  textClassName?: string;
  /** Default: sidebar / header. Rail: tiny terminal left bar. */
  variant?: 'default' | 'rail';
};

/**
 * EX-Setup brand wordmark for dashboard chrome.
 */
export function PipHighWordmark({
  href = '/dashboard',
  className,
  textClassName,
  variant = 'default',
}: Props) {
  if (variant === 'rail') {
    return (
      <Link
        href={href}
        title="Trading home"
        className={cn(
          'flex items-center justify-center rounded-md hover:bg-bg-hover w-9 h-9 transition-colors',
          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#00d048]',
          className,
        )}
      >
        <img src="/images/ex-setup-mark.svg" alt="EX-Setup" className="w-7 h-7 object-contain" />
      </Link>
    );
  }

  const mark = (
    <span className={cn('inline-flex items-center select-none', className)}>
      <img
        src="/images/ex-setup-logo-light.svg"
        alt="EX-Setup"
        className={`logo-dark-mode ${cn('h-8 sm:h-10 w-auto object-contain shrink-0', textClassName)}`}
      />
      <img
        src="/images/ex-setup-logo-on-light.svg"
        alt="EX-Setup"
        className={`logo-light-mode ${cn('h-8 sm:h-10 w-auto object-contain shrink-0', textClassName)}`}
      />
    </span>
  );

  return (
    <Link
      href={href}
      className={cn(
        'min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d048]/60 focus-visible:rounded-md',
        className,
      )}
    >
      {mark}
    </Link>
  );
}

/** Re-export under the new brand name. */
export const EXSetupWordmark = PipHighWordmark;
