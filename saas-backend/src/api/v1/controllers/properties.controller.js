'use strict';

const svc = require('../services/properties.service');
const { writeAudit } = require('../../../utils/audit');

async function create(req, res, next) {
  try {
    const p = await svc.create(req.user.tenantId, req.body, req.user.id);
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'property.create',
      entity: 'property', entityId: p.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.status(201).json(p);
  } catch (err) { next(err); }
}

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
    const p = await svc.update(req.user.tenantId, req.params.id, req.body);
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'property.update',
      entity: 'property', entityId: req.params.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { fields: Object.keys(req.body) },
    });
    res.json(p);
  } catch (err) { next(err); }
}

async function softDelete(req, res, next) {
  try {
    await svc.softDelete(req.user.tenantId, req.params.id);
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'property.delete',
      entity: 'property', entityId: req.params.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getById, update, softDelete };
