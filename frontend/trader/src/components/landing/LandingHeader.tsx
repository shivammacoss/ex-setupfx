'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center shrink-0">
            <img src="/images/stockpip-logo-light.svg" alt="StockPip" className="logo-dark-mode h-9 sm:h-10 w-auto object-contain" />
            <img src="/images/stockpip-logo-on-light.svg" alt="StockPip" className="logo-light-mode h-9 sm:h-10 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {[
              { href: '/', label: 'Home' },
              { href: '/#features', label: 'Features' },
              { href: '/#instruments', label: 'Markets' },
              { href: '/#testimonials', label: 'Reviews' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
