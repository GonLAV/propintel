'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_test_access_secret_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_test_refresh_secret_test';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.COOKIE_SECRET = 'test_cookie_secret';
process.env.LOG_LEVEL = 'silent';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
