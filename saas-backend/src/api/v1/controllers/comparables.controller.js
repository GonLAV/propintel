'use strict';

const svc = require('../services/comparables.service');
const { writeAudit } = require('../../../utils/audit');

async function create(req, res, next) {
  try {
    const c = await svc.create(req.user.tenantId, req.body);
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'comparable.create',
      entity: 'comparable_sale', entityId: c.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { city: c.city, propertyType: c.property_type },
    });
    res.status(201).json(c);
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try { res.json(await svc.list(req.user.tenantId, req.query)); }
  catch (err) { next(err); }
}

module.exports = { create, list };
