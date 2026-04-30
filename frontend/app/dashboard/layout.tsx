import type { Metadata } from 'next'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'PropIntel portfolio valuation command center.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
