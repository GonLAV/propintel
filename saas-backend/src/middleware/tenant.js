'use strict';

const { Forbidden } = require('../utils/errors');

/**
 * Defense-in-depth: if any client supplies a tenantId via path/query/body,
 * it MUST match the tenant claim in the JWT. The repositories already filter
 * by req.user.tenantId, but this guard prevents accidental misuse in routes.
 */
module.exports = function enforceTenant(req, res, next) {
  if (!req.user) return next();
  const claimed = req.params.tenantId
    || req.query.tenantId
    || (req.body && req.body.tenantId);
  if (claimed && claimed !== req.user.tenantId) {
    return next(Forbidden('Cross-tenant access denied'));
  }
  next();
};
