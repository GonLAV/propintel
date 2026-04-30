import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PropIntel',
    short_name: 'PropIntel',
    description: 'Premium real estate valuation intelligence for appraisal and investment teams.',
    start_url: '/',
    display: 'standalone',
    background_color: '#05070d',
    theme_color: '#05070d',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
