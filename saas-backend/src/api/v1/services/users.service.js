'use strict';

const { NotFound, Forbidden, BadRequest } = require('../../../utils/errors');
const usersRepo = require('../repositories/users.repository');
const { encrypt } = require('../../../utils/encryption');
const { paginate } = require('../../../utils/pagination');

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

async function update(tenantId, id, fields) {
  const dbFields = {};
  if (fields.fullName !== undefined) dbFields.full_name = fields.fullName;
  if (fields.status !== undefined)   dbFields.status = fields.status;
  if (fields.phone !== undefined)    dbFields.phone_encrypted = encrypt(fields.phone);
  const u = await usersRepo.update(tenantId, id, dbFields);
  if (!u) throw NotFound('User not found');
  return u;
}

async function changeRole({ tenantId, actor, targetId, newRole }) {
  if (actor.id === targetId && newRole !== actor.role) {
    throw BadRequest('You cannot change your own role');
  }
  if (newRole === 'owner' && actor.role !== 'owner') {
    throw Forbidden('Only an owner can grant owner role');
  }
  const u = await usersRepo.update(tenantId, targetId, { role: newRole });
  if (!u) throw NotFound('User not found');
  return u;
}

async function softDelete({ tenantId, actor, targetId }) {
  if (actor.id === targetId) throw BadRequest('You cannot delete yourself');
  const ok = await usersRepo.softDelete(tenantId, targetId);
  if (!ok) throw NotFound('User not found');
}

module.exports = { list, getById, update, changeRole, softDelete };
