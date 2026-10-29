'use client'

import type { ReactNode } from 'react'
import { formatDateInputPreview } from '@/lib/appraiser-client'

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
  // Native date/time inputs render their internal segments (and the picker
  // icon) using the page's inherited direction. Inside this app's RTL
  // layout that mirrors them into a reversed, left-aligned block that reads
  // as neither Hebrew nor a normal date -- every RTL site keeps these
  // western-numeral controls LTR on purpose, same as phone numbers.
  const forceLtr = props.type === 'date' || props.type === 'time' || props.type === 'datetime-local'
  return (
    <input
      {...props}
      dir={forceLtr ? 'ltr' : props.dir}
      className={`${inputBase} ${forceLtr ? 'text-left' : ''} ${props.className || ''}`}
    />
  )
}

// A plain <Field label=...><Input type="date" /></Field> leaves the only
// unambiguous confirmation of what was actually selected inside a native
// picker widget whose displayed format (MM/DD/YYYY vs DD/MM/YYYY) follows
// the browser's own locale, not this page's. For a field that ends up
// quoted in a legal appraisal report, that's a real misreading risk, so
// this always shows the selected date back in a fixed, unambiguous format.
export function DateField({
  label, value, onChange, required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const preview = formatDateInputPreview(value)
  return (
    <Field label={label}>
      <Input type="date" required={required} value={value} onChange={(e) => onChange(e.target.value)} />
      {preview && <span className="text-xs text-white/40">נבחר: {preview}</span>}
    </Field>
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className || ''}`} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-y ${props.className || ''}`} />
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
