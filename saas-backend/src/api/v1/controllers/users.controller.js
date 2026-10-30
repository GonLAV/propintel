'use strict';

const svc = require('../services/users.service');
const { writeAudit } = require('../../../utils/audit');

async function list(req, res, next) {
  try { res.json(await svc.list(req.user.tenantId, req.query)); }
  catch (err) { next(err); }
}

async function getById(req, res, next) {
  try { res.json(await svc.getById(req.user.tenantId, req.params.id)); }
  catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const u = await svc.update(req.user.tenantId, req.params.id, req.body);
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'user.update',
      entity: 'user', entityId: req.params.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { fields: Object.keys(req.body) },
    });
    res.json(u);
  } catch (err) { next(err); }
}

async function changeRole(req, res, next) {
  try {
    const u = await svc.changeRole({
      tenantId: req.user.tenantId,
      actor: req.user,
      targetId: req.params.id,
      newRole: req.body.role,
    });
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'user.role.change',
      entity: 'user', entityId: req.params.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { newRole: req.body.role },
    });
    res.json(u);
  } catch (err) { next(err); }
}

async function invite(req, res, next) {
  try {
    const { user, inviteToken, expiresAt } = await svc.invite({
      tenantId: req.user.tenantId, actor: req.user, ...req.body,
    });
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'user.invite',
      entity: 'user', entityId: user.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { email: user.email, role: user.role },
    });
    res.status(201).json({ user, inviteToken, expiresAt });
  } catch (err) { next(err); }
}

async function softDelete(req, res, next) {
  try {
    await svc.softDelete({
      tenantId: req.user.tenantId, actor: req.user, targetId: req.params.id,
    });
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'user.delete',
      entity: 'user', entityId: req.params.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, getById, update, changeRole, softDelete, invite };
