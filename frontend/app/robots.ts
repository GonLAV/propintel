import type { MetadataRoute } from 'next'
import { getPublicAppUrl } from '@/lib/public-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicAppUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: baseUrl ? '/' : undefined,
        disallow: baseUrl ? ['/dashboard', '/api', '/register'] : '/',
      },
    ],
    sitemap: baseUrl ? new URL('/sitemap.xml', baseUrl).toString() : undefined,
  }
}
