import type { Plugin, ProxyOptions, PreviewServer, ViteDevServer } from 'vite'

export const MVP_API_PROXY_PATH = '/mvp-api'

export interface MvpApiProxyConfig {
  configured: boolean
  target?: string
  serviceToken?: string
  errorMessage?: string
}

export function resolveMvpApiProxyConfig(env: Record<string, string | undefined>): MvpApiProxyConfig {
  const target = env.MVP_API_TARGET?.trim()
  const serviceToken = env.MVP_API_SERVICE_TOKEN?.trim()
  const missing = [
    !target && 'MVP_API_TARGET',
    !serviceToken && 'MVP_API_SERVICE_TOKEN',
  ].filter(Boolean)

  if (missing.length > 0) {
    return {
      configured: false,
      errorMessage: `MVP API proxy is not configured. Set ${missing.join(' and ')} in the server environment.`,
    }
  }

  if (serviceToken!.length < 32 || /\s/.test(serviceToken!)) {
    return {
      configured: false,
      errorMessage: 'MVP API proxy is not configured. MVP_API_SERVICE_TOKEN must be at least 32 non-whitespace characters.',
    }
  }

  try {
    const parsedTarget = new URL(target!)
    if (!['http:', 'https:'].includes(parsedTarget.protocol) || parsedTarget.username || parsedTarget.password) {
      throw new Error('unsupported target')
    }

    return {
      configured: true,
      target: parsedTarget.toString().replace(/\/+$/, ''),
      serviceToken,
    }
  } catch {
    return {
      configured: false,
      errorMessage: 'MVP API proxy is not configured. MVP_API_TARGET must be an HTTP(S) URL without credentials.',
    }
  }
}

export function rewriteMvpApiPath(path: string): string {
  const rewritten = path.replace(/^\/mvp-api(?=\/|\?|$)/, '')
  return rewritten || '/'
}

export function createMvpApiProxyOptions(config: MvpApiProxyConfig): ProxyOptions | undefined {
  if (!config.configured || !config.target || !config.serviceToken) return undefined

  const serviceToken = config.serviceToken
  return {
    target: config.target,
    changeOrigin: true,
    xfwd: true,
    rewrite: rewriteMvpApiPath,
    configure(proxy) {
      proxy.on('proxyReq', (proxyRequest) => {
        proxyRequest.setHeader('Authorization', `Bearer ${serviceToken}`)
      })
    },
  }
}

function attachUnavailableMiddleware(
  server: Pick<ViteDevServer | PreviewServer, 'middlewares'>,
  config: MvpApiProxyConfig,
) {
  if (config.configured) return

  server.middlewares.use((request, response, next) => {
    const path = request.url || ''
    if (!/^\/mvp-api(?:\/|\?|$)/.test(path)) {
      next()
      return
    }

    response.statusCode = 503
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    response.end(JSON.stringify({
      error: {
        code: 'MVP_API_PROXY_NOT_CONFIGURED',
        message: config.errorMessage || 'MVP API proxy is not configured.',
      },
    }))
  })
}

export function createMvpApiAvailabilityPlugin(config: MvpApiProxyConfig): Plugin {
  return {
    name: 'mvp-api-proxy-availability',
    configureServer(server) {
      attachUnavailableMiddleware(server, config)
    },
    configurePreviewServer(server) {
      attachUnavailableMiddleware(server, config)
    },
  }
}
