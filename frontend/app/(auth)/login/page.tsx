import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to PropIntel.',
}

export default function Page() {
  return <AuthForm mode="login" />
}
