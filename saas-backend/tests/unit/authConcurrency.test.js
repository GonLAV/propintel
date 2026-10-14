'use strict';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('password-hash'),
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/config/database', () => ({
  withTransaction: jest.fn(),
}));
jest.mock('../../src/api/v1/repositories/users.repository', () => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
  findByEmailGlobal: jest.fn(),
  findAuthState: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  setLastLogin: jest.fn(),
}));
jest.mock('../../src/api/v1/repositories/tenants.repository', () => ({
  create: jest.fn(),
  findBySlug: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../../src/api/v1/repositories/refreshTokens.repository', () => ({
  insert: jest.fn(),
  findByHash: jest.fn(),
  revokeById: jest.fn(),
  revokeFamily: jest.fn(),
  revokeAllForUser: jest.fn(),
}));
jest.mock('../../src/api/v1/repositories/passwordResets.repository', () => ({
  findActiveByHash: jest.fn(),
  markUsed: jest.fn(),
  revokeAllForUser: jest.fn(),
}));

const bcrypt = require('bcrypt');
const { withTransaction } = require('../../src/config/database');
const usersRepo = require('../../src/api/v1/repositories/users.repository');
const tenantsRepo = require('../../src/api/v1/repositories/tenants.repository');
const refreshRepo = require('../../src/api/v1/repositories/refreshTokens.repository');
const resetRepo = require('../../src/api/v1/repositories/passwordResets.repository');
const authService = require('../../src/api/v1/services/auth.service');
const passwordResetService = require('../../src/api/v1/services/passwordReset.service');

function serializeTransactions(client) {
  let tail = Promise.resolve();
  withTransaction.mockImplementation(async (fn) => {
    const previous = tail;
    let release;
    tail = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await fn(client);
    } finally {
      release();
    }
  });
}

describe('auth transactional behavior', () => {
  const client = { query: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    withTransaction.mockImplementation((fn) => fn(client));
  });

  test('registration persists its refresh token on the registration transaction client', async () => {
    tenantsRepo.findBySlug.mockResolvedValue(null);
    tenantsRepo.create.mockResolvedValue({ id: 'tenant-1', status: 'active' });
    usersRepo.create.mockResolvedValue({
      id: 'user-1', tenant_id: 'tenant-1', role: 'owner',
    });
    refreshRepo.insert.mockResolvedValue('refresh-1');

    await authService.register({
      email: 'owner@example.com',
      password: 'correct horse battery staple',
      fullName: 'Owner',
      tenantName: 'Acme',
      tenantSlug: 'acme',
    });

    expect(refreshRepo.insert).toHaveBeenCalledTimes(1);
    expect(refreshRepo.insert.mock.calls[0][1]).toBe(client);
  });

  test('concurrent refresh-token reuse allows exactly one successful rotation', async () => {
    serializeTransactions(client);
    const tokenRow = {
      id: 'refresh-1',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      family_id: 'family-1',
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    };
    refreshRepo.findByHash.mockImplementation(async () => ({ ...tokenRow }));
    refreshRepo.insert.mockResolvedValue('replacement-1');
    refreshRepo.revokeById.mockImplementation(async () => {
      if (tokenRow.revoked_at) return false;
      tokenRow.revoked_at = new Date();
      return true;
    });
    refreshRepo.revokeFamily.mockResolvedValue();
    usersRepo.findAuthState.mockResolvedValue({
      id: 'user-1',
      tenant_id: 'tenant-1',
      role: 'member',
      status: 'active',
      tenant_status: 'active',
    });

    const results = await Promise.allSettled([
      authService.refresh({ refreshToken: 'same-token' }),
      authService.refresh({ refreshToken: 'same-token' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(refreshRepo.findByHash).toHaveBeenCalledWith(
      expect.any(String),
      client,
      { forUpdate: true },
    );
    expect(refreshRepo.revokeFamily).toHaveBeenCalledWith('family-1', client);
  });

  test('concurrent password reset confirmation consumes the token exactly once', async () => {
    serializeTransactions(client);
    const reset = {
      id: 'reset-1',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      expires_at: new Date(Date.now() + 60_000),
      used_at: null,
    };
    resetRepo.findActiveByHash.mockImplementation(async () => ({ ...reset }));
    resetRepo.markUsed.mockImplementation(async () => {
      if (reset.used_at) return false;
      reset.used_at = new Date();
      return true;
    });
    usersRepo.findById.mockResolvedValue({ id: 'user-1' });
    usersRepo.update.mockResolvedValue({ id: 'user-1' });

    const results = await Promise.allSettled([
      passwordResetService.confirmReset({ token: 'same-reset', newPassword: 'new password 123' }),
      passwordResetService.confirmReset({ token: 'same-reset', newPassword: 'new password 123' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(usersRepo.update).toHaveBeenCalledTimes(1);
    expect(resetRepo.revokeAllForUser).toHaveBeenCalledTimes(1);
    expect(refreshRepo.revokeAllForUser).toHaveBeenCalledTimes(1);
  });

  test('login rejects a suspended tenant before checking the password', async () => {
    tenantsRepo.findBySlug.mockResolvedValue({ id: 'tenant-1', status: 'suspended' });

    await expect(authService.login({
      email: 'owner@example.com',
      password: 'correct horse battery staple',
      tenantSlug: 'acme',
    })).rejects.toMatchObject({ status: 401 });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});
