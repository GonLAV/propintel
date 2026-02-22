/**
 * Dev-only logger — replaces raw console.log across the codebase.
 * ──────────────────────────────────────────────────────────────
 * In production builds these calls are compiled to no-ops by Vite.
 * Every log is prefixed with the module name for easy filtering.
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger'
 *   const log = createLogger('DataGovAPI')
 *   log.info('Fetching transactions', { city })
 *   log.warn('Empty result set')
 *   log.error('Fetch failed', err)
 */

const IS_DEV = import.meta.env.DEV

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const NOOP = () => {}

function makeLog(module: string, level: LogLevel) {
  if (!IS_DEV) return NOOP
  const method = level === 'debug' ? 'log' : level === 'info' ? 'log' : level
  const prefix = `[${module}]`
  return (...args: unknown[]) => {
    ;(console as unknown as Record<string, (...a: unknown[]) => void>)[method](prefix, ...args)
  }
}

export function createLogger(module: string): Logger {
  return {
    debug: makeLog(module, 'debug'),
    info: makeLog(module, 'info'),
    warn: makeLog(module, 'warn'),
    error: makeLog(module, 'error'),
  }
}
