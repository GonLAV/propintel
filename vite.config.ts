import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vitest/config";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

function phosphorDirectIconImports(): PluginOption {
  const packageName = '@phosphor-icons/react'
  const importRegex = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${packageName}['"];?`, 'g')

  return {
    name: 'phosphor-direct-icon-imports',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(jsx?|tsx?)$/.test(id) || id.includes('node_modules') || !code.includes(packageName)) {
        return null
      }

      let changed = false
      const nextCode = code.replace(importRegex, (fullImport, importSection: string) => {
        if (fullImport.startsWith('import type')) return fullImport

        const imports = importSection
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)

        if (imports.length === 0) return fullImport
        changed = true

        return imports.map((item) => {
          const [iconName, aliasName] = item.split(/\s+as\s+/).map((part) => part.trim())
          const importName = aliasName ? `${iconName} as ${aliasName}` : iconName
          return `import { ${importName} } from '${packageName}/dist/csr/${iconName}'`
        }).join('\n')
      })

      return changed ? nextCode : null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    phosphorDirectIconImports(),
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
          if (/[\\/]node_modules[\\/]@github[\\/]spark[\\/]/.test(id)) return 'spark-vendor'
          if (/[\\/]node_modules[\\/](@radix-ui|cmdk|vaul|sonner|class-variance-authority|tailwind-merge|clsx)[\\/]/.test(id)) return 'ui-vendor'
          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion-vendor'
          if (/[\\/]node_modules[\\/](@tanstack|react-hook-form|@hookform|zod)[\\/]/.test(id)) return 'forms-vendor'
          if (/[\\/]node_modules[\\/](recharts|d3)[\\/]/.test(id)) return 'charts-vendor'
          if (/[\\/]node_modules[\\/]jspdf[\\/]/.test(id)) return 'pdf-vendor'
          if (/[\\/]node_modules[\\/]html2canvas[\\/]/.test(id)) return 'canvas-vendor'
          if (/[\\/]node_modules[\\/](pdfjs-dist|tesseract.js)[\\/]/.test(id)) return 'ocr-vendor'
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three-vendor'
          if (/[\\/]node_modules[\\/]date-fns[\\/]/.test(id)) return 'date-vendor'
          if (/[\\/]node_modules[\\/]@phosphor-icons[\\/]react[\\/]/.test(id)) {
            const iconName = id.match(/[\\/]dist[\\/]csr[\\/]([A-Z])/)?.[1] ?? 'other'
            if (iconName <= 'F') return 'icons-a-f-vendor'
            if (iconName <= 'M') return 'icons-g-m-vendor'
            if (iconName <= 'S') return 'icons-n-s-vendor'
            return 'icons-t-z-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'saas-backend/**', '**/__wt/**'],
  },
});
