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
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'saas-backend/**', '**/__wt/**'],
  },
});
