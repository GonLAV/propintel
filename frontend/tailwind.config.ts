import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#05070d',
        panel: 'rgba(12, 18, 32, 0.72)',
        line: 'rgba(255, 255, 255, 0.12)',
        mist: '#eef4ff',
        cobalt: '#4f7cff',
        cyan: '#24d2ff',
        mint: '#38efb5',
        rose: '#ff5e8a',
        amber: '#ffc857',
      },
      boxShadow: {
        glow: '0 0 80px rgba(79, 124, 255, 0.24)',
        premium: '0 24px 80px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'premium-grid': 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 9s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
