'use strict';

const { randomUUID } = require('node:crypto');

const ID_RE = /^[A-Za-z0-9._-]{8,128}$/;

module.exports = function correlationId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = (typeof incoming === 'string' && ID_RE.test(incoming)) ? incoming : randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
