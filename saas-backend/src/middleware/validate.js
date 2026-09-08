'use strict';

const { ZodError } = require('zod');
const { BadRequest } = require('../utils/errors');

const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body)   req.body   = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query)  req.query  = schemas.query.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return next(BadRequest('Validation failed', err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      }))));
    }
    next(err);
  }
};

module.exports = { validate };
