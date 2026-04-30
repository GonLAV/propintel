import type { Metadata } from 'next'
import { SettingsPanel } from '@/components/dashboard/settings-panel'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure PropIntel workspace settings.',
}

export default function Page() {
  return <SettingsPanel />
}
