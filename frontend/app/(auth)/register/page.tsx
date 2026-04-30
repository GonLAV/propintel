import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create your PropIntel workspace.',
}

export default function Page() {
  return <AuthForm mode="register" />
}
