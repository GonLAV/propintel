'use strict';

jest.mock('../../src/config/database', () => ({
  withTransaction: jest.fn((fn) => fn({ query: jest.fn() })),
}));
jest.mock('../../src/api/v1/repositories/users.repository', () => ({
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  countActiveOwners: jest.fn(),
}));
jest.mock('../../src/api/v1/repositories/tenants.repository', () => ({
  lockById: jest.fn(),
}));
jest.mock('../../src/utils/audit', () => ({
  writeAudit: jest.fn(),
}));

const usersRepo = require('../../src/api/v1/repositories/users.repository');
const tenantsRepo = require('../../src/api/v1/repositories/tenants.repository');
const { writeAudit } = require('../../src/utils/audit');
const service = require('../../src/api/v1/services/users.service');

describe('owner mutation protections and durable auditing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    writeAudit.mockResolvedValue();
    tenantsRepo.lockById.mockResolvedValue({ id: 'tenant-1' });
    usersRepo.countActiveOwners.mockResolvedValue(2);
  });

  test('admin cannot disable an owner', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'owner-1', role: 'owner' });

    await expect(service.update({
      tenantId: 'tenant-1',
      actor: { id: 'admin-1', role: 'admin' },
      targetId: 'owner-1',
      fields: { status: 'disabled' },
    })).rejects.toMatchObject({ status: 403 });
    expect(usersRepo.update).not.toHaveBeenCalled();
  });

  test('admin cannot demote an owner based on the target current role', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'owner-1', role: 'owner' });

    await expect(service.changeRole({
      tenantId: 'tenant-1',
      actor: { id: 'admin-1', role: 'admin' },
      targetId: 'owner-1',
      newRole: 'member',
    })).rejects.toMatchObject({ status: 403 });
    expect(usersRepo.update).not.toHaveBeenCalled();
  });

  test('admin cannot delete an owner based on the target current role', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'owner-1', role: 'owner' });

    await expect(service.softDelete({
      tenantId: 'tenant-1',
      actor: { id: 'admin-1', role: 'admin' },
      targetId: 'owner-1',
    })).rejects.toMatchObject({ status: 403 });
    expect(usersRepo.softDelete).not.toHaveBeenCalled();
  });

  test('role mutation fails when its required audit entry cannot persist', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'member-1', role: 'member' });
    usersRepo.update.mockResolvedValue({ id: 'member-1', role: 'admin' });
    writeAudit.mockRejectedValue(new Error('audit unavailable'));

    await expect(service.changeRole({
      tenantId: 'tenant-1',
      actor: { id: 'owner-1', role: 'owner' },
      targetId: 'member-1',
      newRole: 'admin',
    })).rejects.toThrow('audit unavailable');
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.role.change' }),
      expect.objectContaining({ required: true }),
    );
  });

  test('delete mutation fails when its required audit entry cannot persist', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'member-1', role: 'member' });
    usersRepo.softDelete.mockResolvedValue(true);
    writeAudit.mockRejectedValue(new Error('audit unavailable'));

    await expect(service.softDelete({
      tenantId: 'tenant-1',
      actor: { id: 'owner-1', role: 'owner' },
      targetId: 'member-1',
    })).rejects.toThrow('audit unavailable');
  });

  test('cannot remove the final active owner after locking the tenant', async () => {
    usersRepo.findById.mockResolvedValue({
      id: 'owner-1', role: 'owner', status: 'active',
    });
    usersRepo.countActiveOwners.mockResolvedValue(1);

    await expect(service.changeRole({
      tenantId: 'tenant-1',
      actor: { id: 'owner-2', role: 'owner' },
      targetId: 'owner-1',
      newRole: 'member',
    })).rejects.toMatchObject({ status: 400 });
    expect(tenantsRepo.lockById).toHaveBeenCalledWith('tenant-1', expect.any(Object));
    expect(usersRepo.update).not.toHaveBeenCalled();
  });

  test('update mutation fails when its required audit entry cannot persist', async () => {
    usersRepo.findById.mockResolvedValue({
      id: 'member-1', role: 'member', status: 'active',
    });
    usersRepo.update.mockResolvedValue({ id: 'member-1', status: 'disabled' });
    writeAudit.mockRejectedValue(new Error('audit unavailable'));

    await expect(service.update({
      tenantId: 'tenant-1',
      actor: { id: 'owner-1', role: 'owner' },
      targetId: 'member-1',
      fields: { status: 'disabled' },
    })).rejects.toThrow('audit unavailable');
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.update' }),
      expect.objectContaining({ required: true }),
    );
  });
});
