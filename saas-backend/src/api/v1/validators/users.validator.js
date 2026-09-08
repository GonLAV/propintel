'use strict';

const { z } = require('zod');

const idParam = z.object({ id: z.string().uuid() }).strict();

const list = z.object({
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
}).strict();

const update = z.object({
  fullName: z.string().min(1).max(120).optional(),
  status: z.enum(['active', 'disabled', 'pending']).optional(),
  phone: z.string().min(3).max(40).optional(),
}).strict();

const changeRole = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
}).strict();

module.exports = { idParam, list, update, changeRole };
