export const sessionCookieName = 'propintel_session'
export const sessionIssuer = 'propintel-web'
export const sessionAudience = 'propintel-users'
export const sessionMaxAgeSeconds = 60 * 60 * 8

const developmentSecret = 'development_secret_replace_before_production_only_for_local_dev'

export function getJwtSecret() {
  const configuredSecret = process.env.JWT_SECRET

  if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production')
  }

  return new TextEncoder().encode(configuredSecret || developmentSecret)
}
