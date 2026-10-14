export function getPublicAppUrl(
  env: Partial<Pick<NodeJS.ProcessEnv, 'NEXT_PUBLIC_APP_URL' | 'NODE_ENV'>> = process.env,
) {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim()

  if (configured) {
    try {
      const url = new URL(configured)
      if (!['http:', 'https:'].includes(url.protocol)) return null
      if (env.NODE_ENV === 'production' && isLocalHostname(url.hostname)) return null
      url.pathname = url.pathname.replace(/\/+$/, '')
      url.search = ''
      url.hash = ''
      return url
    } catch {
      return null
    }
  }

  return env.NODE_ENV === 'production' ? null : new URL('http://localhost:3000')
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}
