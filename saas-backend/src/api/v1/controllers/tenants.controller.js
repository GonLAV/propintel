'use strict';

const svc = require('../services/tenants.service');
const { writeAudit } = require('../../../utils/audit');

async function getMine(req, res, next) {
  try { res.json(await svc.getById(req.user.tenantId)); }
  catch (err) { next(err); }
}

async function updateMine(req, res, next) {
  try {
    const t = await svc.updateName(req.user.tenantId, req.body.name);
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'tenant.update',
      entity: 'tenant', entityId: req.user.tenantId,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { fields: Object.keys(req.body) },
    });
    res.json(t);
  } catch (err) { next(err); }
}

module.exports = { getMine, updateMine };
