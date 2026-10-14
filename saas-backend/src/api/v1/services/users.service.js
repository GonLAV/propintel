'use strict';

const { NotFound, Forbidden, BadRequest } = require('../../../utils/errors');
const { withTransaction } = require('../../../config/database');
const usersRepo = require('../repositories/users.repository');
const tenantsRepo = require('../repositories/tenants.repository');
const { encrypt } = require('../../../utils/encryption');
const { paginate } = require('../../../utils/pagination');
const { writeAudit } = require('../../../utils/audit');

async function list(tenantId, query) {
  const { limit, offset, page, pageSize } = paginate(query);
  const { rows, total } = await usersRepo.list(tenantId, {
    q: query.q, role: query.role, limit, offset,
  });
  return { items: rows, page, pageSize, total };
}

async function getById(tenantId, id) {
  const u = await usersRepo.findById(tenantId, id);
  if (!u) throw NotFound('User not found');
  return u;
}

async function ensureAnotherActiveOwner(tenantId, client) {
  const tenant = await tenantsRepo.lockById(tenantId, client);
  if (!tenant) throw NotFound('Tenant not found');
  const activeOwnerCount = await usersRepo.countActiveOwners(tenantId, client);
  if (activeOwnerCount <= 1) {
    throw BadRequest('A tenant must keep at least one active owner');
  }
}

async function update({
  tenantId, actor, targetId, fields, audit = {},
}) {
  return withTransaction(async (client) => {
    const target = await usersRepo.findById(tenantId, targetId, client, { forUpdate: true });
    if (!target) throw NotFound('User not found');
    if (
      actor.role === 'admin'
      && target.role === 'owner'
      && fields.status !== undefined
      && fields.status !== 'active'
    ) {
      throw Forbidden('Admins cannot disable an owner');
    }
    if (
      target.role === 'owner'
      && target.status === 'active'
      && fields.status !== undefined
      && fields.status !== 'active'
    ) {
      await ensureAnotherActiveOwner(tenantId, client);
    }
    const dbFields = {};
    if (fields.fullName !== undefined) dbFields.full_name = fields.fullName;
    if (fields.status !== undefined)   dbFields.status = fields.status;
    if (fields.phone !== undefined)    dbFields.phone_encrypted = encrypt(fields.phone);
    const u = await usersRepo.update(tenantId, targetId, dbFields, client);
    if (!u) throw NotFound('User not found');
    await writeAudit({
      tenantId,
      userId: actor.id,
      action: 'user.update',
      entity: 'user',
      entityId: targetId,
      ip: audit.ip,
      userAgent: audit.userAgent,
      metadata: { fields: Object.keys(fields) },
    }, { required: true, client });
    return u;
  });
}

async function changeRole({
  tenantId, actor, targetId, newRole, audit = {},
}) {
  if (actor.id === targetId && newRole !== actor.role) {
    throw BadRequest('You cannot change your own role');
  }
  if (newRole === 'owner' && actor.role !== 'owner') {
    throw Forbidden('Only an owner can grant owner role');
  }
  return withTransaction(async (client) => {
    const target = await usersRepo.findById(tenantId, targetId, client, { forUpdate: true });
    if (!target) throw NotFound('User not found');
    if (actor.role === 'admin' && target.role === 'owner') {
      throw Forbidden('Admins cannot change an owner role');
    }
    if (target.role === 'owner' && target.status === 'active' && newRole !== 'owner') {
      await ensureAnotherActiveOwner(tenantId, client);
    }
    const u = await usersRepo.update(tenantId, targetId, { role: newRole }, client);
    if (!u) throw NotFound('User not found');
    await writeAudit({
      tenantId,
      userId: actor.id,
      action: 'user.role.change',
      entity: 'user',
      entityId: targetId,
      ip: audit.ip,
      userAgent: audit.userAgent,
      metadata: { previousRole: target.role, newRole },
    }, { required: true, client });
    return u;
  });
}

async function softDelete({
  tenantId, actor, targetId, audit = {},
}) {
  if (actor.id === targetId) throw BadRequest('You cannot delete yourself');
  return withTransaction(async (client) => {
    const target = await usersRepo.findById(tenantId, targetId, client, { forUpdate: true });
    if (!target) throw NotFound('User not found');
    if (actor.role === 'admin' && target.role === 'owner') {
      throw Forbidden('Admins cannot delete an owner');
    }
    if (target.role === 'owner' && target.status === 'active') {
      await ensureAnotherActiveOwner(tenantId, client);
    }
    const ok = await usersRepo.softDelete(tenantId, targetId, client);
    if (!ok) throw NotFound('User not found');
    await writeAudit({
      tenantId,
      userId: actor.id,
      action: 'user.delete',
      entity: 'user',
      entityId: targetId,
      ip: audit.ip,
      userAgent: audit.userAgent,
      metadata: { previousRole: target.role },
    }, { required: true, client });
  });
}

module.exports = { list, getById, update, changeRole, softDelete };
