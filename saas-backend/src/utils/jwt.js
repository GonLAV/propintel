'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

function signAccessToken({ sub, tenantId, role }) {
  return jwt.sign(
    { sub, tenantId, role, typ: 'access' },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessTtl,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithm: 'HS256',
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithms: ['HS256'],
  });
}

module.exports = { signAccessToken, verifyAccessToken };
