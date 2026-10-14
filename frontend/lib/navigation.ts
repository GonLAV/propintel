export function getPathWithSearch(pathname: string, search: string) {
  return `${pathname}${search}`
}

export function getSafeInternalPath(value: string | null, origin: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/dashboard'
  }

  try {
    const parsed = new URL(value, origin)
    return parsed.origin === origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : '/dashboard'
  } catch {
    return '/dashboard'
  }
}

export function isDashboardNavActive(href: string, pathname: string, hash: string) {
  const [targetPath, targetHash = ''] = href.split('#')
  if (pathname !== targetPath) return false

  if (targetHash) {
    return hash === `#${targetHash}`
  }

  return targetPath !== '/dashboard' || !hash
}
