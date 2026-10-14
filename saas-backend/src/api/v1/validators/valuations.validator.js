'use strict';

const { z } = require('zod');

const idParam = z.object({ id: z.string().uuid() }).strict();

const incomeInputs = z.object({
  rentPerSqmMonth: z.coerce.number().positive().max(1_000_000).optional(),
  capRate: z.coerce.number().positive().max(1).optional(),
  vacancyRate: z.coerce.number().min(0).lt(1).optional(),
  opexRatio: z.coerce.number().min(0).lt(1).optional(),
}).strict();

const create = z.object({
  propertyId: z.string().uuid(),
  method: z.enum(['comparables', 'cost', 'income', 'reconciled']).default('comparables'),
  inputs: incomeInputs.optional(),
}).strict();

const list = z.object({
  propertyId: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

module.exports = { idParam, create, list };
