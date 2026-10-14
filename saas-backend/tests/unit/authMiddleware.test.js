'use strict';

jest.mock('../../src/api/v1/repositories/users.repository', () => ({
  findAuthState: jest.fn(),
}));

const usersRepo = require('../../src/api/v1/repositories/users.repository');
const { signAccessToken } = require('../../src/utils/jwt');
const { authenticate } = require('../../src/middleware/auth');

function runAuthenticate(token) {
  const req = { headers: { authorization: `Bearer ${token}` } };
  return new Promise((resolve) => {
    authenticate(req, {}, (err) => resolve({ err, req }));
  });
}

describe('authenticate tenant and account status checks', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects an otherwise valid token for a suspended tenant', async () => {
    usersRepo.findAuthState.mockResolvedValue({
      id: 'user-1',
      tenant_id: 'tenant-1',
      role: 'owner',
      status: 'active',
      tenant_status: 'suspended',
    });
    const token = signAccessToken({ sub: 'user-1', tenantId: 'tenant-1', role: 'owner' });

    const { err } = await runAuthenticate(token);

    expect(err).toMatchObject({ status: 401 });
  });

  test('uses the current database role for an active user and tenant', async () => {
    usersRepo.findAuthState.mockResolvedValue({
      id: 'user-1',
      tenant_id: 'tenant-1',
      role: 'member',
      status: 'active',
      tenant_status: 'active',
    });
    const token = signAccessToken({ sub: 'user-1', tenantId: 'tenant-1', role: 'admin' });

    const { err, req } = await runAuthenticate(token);

    expect(err).toBeUndefined();
    expect(req.user.role).toBe('member');
  });
});
