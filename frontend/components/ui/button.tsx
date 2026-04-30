import Link from 'next/link'
import { cn } from '@/lib/utils'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

const variants = {
  primary: 'bg-white text-ink shadow-premium hover:bg-mist',
  secondary: 'border border-white/15 bg-white/10 text-white hover:bg-white/15',
  ghost: 'text-white/72 hover:bg-white/10 hover:text-white',
}

const base = 'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan/60 disabled:cursor-not-allowed disabled:opacity-55'

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], className)} {...props} />
}

export function LinkButton({ className, variant = 'primary', ...props }: LinkButtonProps) {
  return <Link className={cn(base, variants[variant], className)} {...props} />
}
