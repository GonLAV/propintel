import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'PropIntel | Premium Real Estate Valuation Platform',
    template: '%s | PropIntel',
  },
  description: 'A premium SaaS platform for real estate valuation, market intelligence, appraisal reporting, and portfolio risk review.',
  keywords: ['real estate valuation', 'appraisal software', 'AVM', 'SaaS', 'property intelligence'],
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'PropIntel',
    description: 'High-end real estate valuation intelligence for modern appraisal and investment teams.',
    type: 'website',
    siteName: 'PropIntel',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05070d',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
