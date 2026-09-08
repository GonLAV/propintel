'use client'

import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Field({
  label, children,
}: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/70">{label}</span>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/30 outline-none transition focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/20'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className || ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className || ''}`} />
}

export function Button({
  children, variant = 'primary', className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const styles =
    variant === 'primary'
      ? 'bg-teal-300 text-black hover:bg-teal-200'
      : 'border border-white/20 text-white hover:bg-white/10'
  return (
    <button
      {...rest}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {message}
    </div>
  )
}
