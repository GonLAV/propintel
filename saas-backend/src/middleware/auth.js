'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { Unauthorized, Forbidden } = require('../utils/errors');

function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return next(Unauthorized('Missing bearer token'));
  try {
    const payload = verifyAccessToken(m[1]);
    if (payload.typ !== 'access') throw new Error('wrong token type');
    req.user = { id: payload.sub, tenantId: payload.tenantId, role: payload.role };
    req.tenantId = payload.tenantId;
    if (req.log) req.log = req.log.child({ userId: req.user.id, tenantId: req.tenantId });
    next();
  } catch (e) {
    next(Unauthorized('Invalid or expired token'));
  }
}

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(Unauthorized());
  if (roles.length && !roles.includes(req.user.role)) {
    return next(Forbidden('Insufficient role'));
  }
  next();
};

module.exports = { authenticate, authorize };
