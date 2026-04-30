'use strict';

class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL', details, expose = true } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }
}

const factory = (status, code, defaultMsg) => (msg, details) =>
  new AppError(msg || defaultMsg, { status, code, details });

module.exports = {
  AppError,
  BadRequest:   factory(400, 'BAD_REQUEST',     'Bad request'),
  Unauthorized: factory(401, 'UNAUTHORIZED',    'Unauthorized'),
  Forbidden:    factory(403, 'FORBIDDEN',       'Forbidden'),
  NotFound:     factory(404, 'NOT_FOUND',       'Not found'),
  Conflict:     factory(409, 'CONFLICT',        'Conflict'),
  TooMany:      factory(429, 'TOO_MANY',        'Too many requests'),
};
