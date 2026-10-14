import type { MetadataRoute } from 'next'
import { getPublicAppUrl } from '@/lib/public-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicAppUrl()
  if (!baseUrl) return []

  const now = new Date()

  return [
    {
      url: baseUrl.toString(),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: new URL('/login', baseUrl).toString(),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
