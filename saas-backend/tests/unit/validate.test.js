'use strict';

const { z } = require('zod');
const { validate } = require('../../src/middleware/validate');

function runMw(mw, req) {
  return new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });
}

describe('validate middleware', () => {
  test('passes valid body and coerces query', async () => {
    const mw = validate({
      body: z.object({ x: z.number() }).strict(),
      query: z.object({ n: z.coerce.number() }).strict(),
    });
    const req = { body: { x: 1 }, query: { n: '42' }, params: {} };
    const err = await runMw(mw, req);
    expect(err).toBeUndefined();
    expect(req.query.n).toBe(42);
  });

  test('rejects invalid body with 400 AppError', async () => {
    const mw = validate({ body: z.object({ x: z.number() }).strict() });
    const err = await runMw(mw, { body: { x: 'no' }, query: {}, params: {} });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
  });
});
