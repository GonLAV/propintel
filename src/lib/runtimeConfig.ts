const MVP_API_PROXY_BASE_URL = '/mvp-api'

export function getMvpApiBaseUrl(): string {
  return MVP_API_PROXY_BASE_URL
}

export const runtimeConfig = {
  mvpApiBaseUrl: getMvpApiBaseUrl(),
}