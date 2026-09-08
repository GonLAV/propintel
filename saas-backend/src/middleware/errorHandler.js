'use strict';

const { AppError } = require('../utils/errors');
const config = require('../config');

function notFound(req, res, next) {
  next(new AppError('Route not found', { status: 404, code: 'NOT_FOUND' }));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isApp = err instanceof AppError;
  const status = isApp ? err.status : (err.status || 500);
  const code = isApp ? err.code : (err.code || 'INTERNAL');
  const expose = isApp ? err.expose : status < 500;

  if (req.log) {
    const lvl = status >= 500 ? 'error' : 'warn';
    req.log[lvl]({ err, status, code }, 'request error');
  }

  const body = {
    error: {
      code,
      message: expose ? err.message : 'Internal Server Error',
      requestId: req.id,
    },
  };
  if (isApp && err.details) body.error.details = err.details;
  if (!config.isProd && status >= 500) body.error.stack = err.stack;

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
