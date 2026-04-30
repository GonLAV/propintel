'use strict';

const { z } = require('zod');

const idParam = z.object({ id: z.string().uuid() }).strict();

const create = z.object({
  valuationId: z.string().uuid(),
  title: z.string().min(2).max(255),
  format: z.enum(['json', 'markdown', 'pdf']).default('json'),
}).strict();

const list = z.object({
  valuationId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

module.exports = { idParam, create, list };
