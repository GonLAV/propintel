'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { Unauthorized, Forbidden } = require('../utils/errors');
const usersRepo = require('../api/v1/repositories/users.repository');

async function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return next(Unauthorized('Missing bearer token'));
  let payload;
  try {
    payload = verifyAccessToken(m[1]);
    if (payload.typ !== 'access') throw new Error('wrong token type');
  } catch (e) {
    return next(Unauthorized('Invalid or expired token'));
  }

  try {
    const state = await usersRepo.findAuthState(payload.tenantId, payload.sub);
    if (!state || state.status !== 'active' || state.tenant_status !== 'active') {
      return next(Unauthorized('Account or tenant is not active'));
    }
    req.user = { id: state.id, tenantId: state.tenant_id, role: state.role };
    req.tenantId = state.tenant_id;
    if (req.log) req.log = req.log.child({ userId: req.user.id, tenantId: req.tenantId });
    return next();
  } catch (e) {
    return next(e);
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
