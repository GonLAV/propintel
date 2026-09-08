'use strict';

const svc = require('../services/valuations.service');
const { writeAudit } = require('../../../utils/audit');

async function create(req, res, next) {
  try {
    const v = await svc.create(req.user.tenantId, { ...req.body, createdBy: req.user.id });
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'valuation.create',
      entity: 'valuation', entityId: v.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { propertyId: req.body.propertyId, method: req.body.method },
    });
    res.status(201).json(v);
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

async function softDelete(req, res, next) {
  try {
    await svc.softDelete(req.user.tenantId, req.params.id);
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'valuation.delete',
      entity: 'valuation', entityId: req.params.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getById, softDelete };
