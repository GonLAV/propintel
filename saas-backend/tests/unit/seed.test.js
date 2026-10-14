'use strict';

jest.mock('../../src/config/database', () => ({
  pool: { end: jest.fn() },
  query: jest.fn(),
}));

const { main } = require('../../seed');

describe('development seed reruns', () => {
  test('updates the existing owner password hash without logging the password', async () => {
    const dbQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-1', slug: 'demo' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'owner-1', email: 'owner@demo.test' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ c: 1 }] })
      .mockResolvedValueOnce({ rows: [{ c: 5 }] });
    const hashPassword = jest.fn().mockResolvedValue('updated-password-hash');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const password = 'new-seed-password';

    await main({
      dbQuery,
      hashPassword,
      env: {
        SEED_OWNER_EMAIL: 'owner@demo.test',
        SEED_OWNER_PASSWORD: password,
      },
    });

    expect(hashPassword).toHaveBeenCalledWith(password, expect.any(Number));
    expect(dbQuery.mock.calls[2][0]).toContain('UPDATE users');
    expect(dbQuery.mock.calls[2][1]).toEqual([
      'tenant-1', 'owner@demo.test', 'updated-password-hash',
    ]);
    expect(log.mock.calls.flat().join(' ')).not.toContain(password);
    log.mockRestore();
  });
});
