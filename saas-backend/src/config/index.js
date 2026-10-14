'use strict';

const { isIP } = require('node:net');

const env = process.env.NODE_ENV || 'development';

function required(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (process.env.NODE_ENV === 'test') return '';
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function num(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name}`);
  return n;
}

function list(name, def = []) {
  const v = process.env[name];
  if (!v) return def;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

function trustProxy(name = 'TRUST_PROXY') {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return false;

  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    if (Number.isSafeInteger(hops) && hops >= 0 && hops <= 255) return hops;
  }

  const namedRanges = new Set(['loopback', 'linklocal', 'uniquelocal']);
  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  const valid = entries.length > 0 && entries.every((entry) => {
    if (namedRanges.has(entry)) return true;
    const [address, prefix, ...rest] = entry.split('/');
    if (rest.length || !isIP(address)) return false;
    if (prefix === undefined) return true;
    if (!/^\d+$/.test(prefix)) return false;
    const maxPrefix = isIP(address) === 4 ? 32 : 128;
    return Number(prefix) >= 0 && Number(prefix) <= maxPrefix;
  });
  if (valid) return entries;

  throw new Error(
    `${name} must be false, true, a hop count from 0-255, or a comma-separated IP/CIDR allowlist`,
  );
}

function encryptionKey(name = 'ENCRYPTION_KEY') {
  const fallback = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const value = process.env[name] || (env !== 'production' ? fallback : required(name));
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} must be exactly 64 hexadecimal characters (32 bytes)`);
  }
  return value.toLowerCase();
}

module.exports = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: num('PORT', 3000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  logLevel: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
  trustProxy: trustProxy(),
  corsOrigins: list('CORS_ORIGINS', ['http://localhost:5173']),

  database: {
    url: process.env.DATABASE_URL || (env === 'test' ? '' : required('DATABASE_URL')),
    poolMax: num('PG_POOL_MAX', 20),
    idleTimeoutMs: num('PG_IDLE_TIMEOUT_MS', 30000),
    connectionTimeoutMs: num('PG_CONNECTION_TIMEOUT_MS', 5000),
    ssl: process.env.PG_SSL === 'true',
    sslCa: process.env.PG_SSL_CA ? process.env.PG_SSL_CA.replace(/\\n/g, '\n') : undefined,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'saas:',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET
      || (env !== 'production' ? 'dev_access_secret_dev_access_secret' : required('JWT_ACCESS_SECRET')),
    refreshSecret: process.env.JWT_REFRESH_SECRET
      || (env !== 'production' ? 'dev_refresh_secret_dev_refresh_secret' : required('JWT_REFRESH_SECRET')),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    issuer: process.env.JWT_ISSUER || 'propintel',
    audience: process.env.JWT_AUDIENCE || 'propintel-clients',
  },

  bcryptRounds: num('BCRYPT_ROUNDS', 12),

  encryptionKeyHex: encryptionKey(),

  rateLimit: {
    ipWindowMs: num('RATE_LIMIT_IP_WINDOW_MS', 60_000),
    ipMax: num('RATE_LIMIT_IP_MAX', 120),
    userWindowMs: num('RATE_LIMIT_USER_WINDOW_MS', 60_000),
    userMax: num('RATE_LIMIT_USER_MAX', 300),
    authWindowMs: num('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60_000),
    authMax: num('RATE_LIMIT_AUTH_MAX', 10),
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev_cookie_secret',
    secure: process.env.COOKIE_SECURE === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
    },
  },
};
