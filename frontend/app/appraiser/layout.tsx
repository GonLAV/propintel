import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './appraiser.css'

const heebo = Heebo({ subsets: ['hebrew', 'latin'], variable: '--font-heebo' })

export const metadata: Metadata = {
  title: 'PropIntel לשמאים',
  description: 'תיקי שומה, קומפרבלים ושומות אמיתיות — עברית מלאה, מהירות היא התכונה.',
}

export default function AppraiserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="he" className={`${heebo.variable} appraiser-root`}>
      {children}
    </div>
  )
}
