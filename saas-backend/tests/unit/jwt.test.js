'use strict';

const { signAccessToken, verifyAccessToken } = require('../../src/utils/jwt');

describe('jwt', () => {
  test('sign + verify access token', () => {
    const t = signAccessToken({ sub: 'user-1', tenantId: 'tenant-1', role: 'admin' });
    const decoded = verifyAccessToken(t);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.tenantId).toBe('tenant-1');
    expect(decoded.role).toBe('admin');
  });

  test('verify rejects tampered token', () => {
    const t = signAccessToken({ sub: 'u', tenantId: 't', role: 'member' });
    expect(() => verifyAccessToken(`${t}x`)).toThrow();
  });
});
