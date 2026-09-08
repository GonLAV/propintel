'use strict';

const svc = require('../services/reports.service');
const { writeAudit } = require('../../../utils/audit');

async function create(req, res, next) {
  try {
    const r = await svc.create(req.user.tenantId, { ...req.body, createdBy: req.user.id });
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'report.create',
      entity: 'report', entityId: r.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
      metadata: { valuationId: req.body.valuationId, format: req.body.format },
    });
    res.status(201).json(r);
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
      tenantId: req.user.tenantId, userId: req.user.id, action: 'report.delete',
      entity: 'report', entityId: req.params.id,
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

async function downloadPdf(req, res, next) {
  try {
    const { buffer, filename } = await svc.getPdf(req.user.tenantId, req.params.id);
    // Hebrew titles aren't valid in the plain `filename=` token per RFC 6266,
    // so send both: an ASCII fallback and the real UTF-8 name via filename*.
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.set('Content-Length', String(buffer.length));
    res.status(200).send(buffer);
  } catch (err) { next(err); }
}

module.exports = { create, list, getById, softDelete, downloadPdf };
