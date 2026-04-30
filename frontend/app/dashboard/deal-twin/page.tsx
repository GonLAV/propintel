import type { Metadata } from 'next'
import { DealTwinConsole } from '@/components/deal-twin/deal-twin-console'

export const metadata: Metadata = {
  title: 'Deal Twin',
  description: 'Counterfactual investment committee simulator for real estate decisions.',
}

export default function Page() {
  return <DealTwinConsole />
}