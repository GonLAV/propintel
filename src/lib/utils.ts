import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID. Uses `crypto.randomUUID()` when available,
 * falls back to a timestamp + random suffix otherwise.
 */
export function uid(prefix = ''): string {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  return prefix ? `${prefix}_${id}` : id
}
