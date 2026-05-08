'use client'

import { useEffect } from 'react'
import '@/landing/landing.css'
import '@/landing/SiteLanding.css'

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  /* Override trader-app theme for landing pages */
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', 'dark')
    html.style.backgroundColor = '#000000'
    html.style.color = '#ffffff'
    return () => {
      html.setAttribute('data-theme', 'light')
      html.style.backgroundColor = '#F2EFE9'
      html.style.color = '#000000'
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  )
}
