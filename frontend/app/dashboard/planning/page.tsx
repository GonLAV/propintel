import type { Metadata } from 'next'
import { PlanningConsole } from '@/components/planning/planning-console'

export const metadata: Metadata = {
  title: 'Planning Intelligence',
  description: 'Compare Israeli planning rights and betterment levy inputs.',
}

export default function Page() {
  return <PlanningConsole />
}
