'use strict';

const svc = require('../services/users.service');

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
    const u = await svc.update({
      tenantId: req.user.tenantId,
      actor: req.user,
      targetId: req.params.id,
      fields: req.body,
      audit: { ip: req.ip, userAgent: req.headers['user-agent'] },
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
      audit: { ip: req.ip, userAgent: req.headers['user-agent'] },
    });
    res.json(u);
  } catch (err) { next(err); }
}

async function softDelete(req, res, next) {
  try {
    await svc.softDelete({
      tenantId: req.user.tenantId, actor: req.user, targetId: req.params.id,
      audit: { ip: req.ip, userAgent: req.headers['user-agent'] },
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, getById, update, changeRole, softDelete };
