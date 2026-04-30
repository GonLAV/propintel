'use strict';

const { z } = require('zod');

const idParam = z.object({ id: z.string().uuid() }).strict();

const create = z.object({
  propertyId: z.string().uuid(),
  method: z.enum(['comparables', 'cost', 'income', 'reconciled']).default('comparables'),
  inputs: z.record(z.any()).optional(),
}).strict();

const list = z.object({
  propertyId: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

module.exports = { idParam, create, list };
