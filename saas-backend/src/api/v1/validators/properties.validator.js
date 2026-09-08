'use strict';

const { z } = require('zod');

const PROPERTY_TYPES = ['apartment', 'house', 'office', 'retail', 'land', 'other'];

const idParam = z.object({ id: z.string().uuid() }).strict();

const create = z.object({
  externalRef: z.string().max(64).optional(),
  address: z.string().min(2).max(255),
  city: z.string().min(1).max(120),
  propertyType: z.enum(PROPERTY_TYPES),
  areaSqm: z.number().positive().max(1_000_000).optional(),
  rooms: z.number().min(0).max(50).optional(),
  floor: z.number().int().min(-5).max(200).optional(),
  yearBuilt: z.number().int().min(1700).max(2100).optional(),
  metadata: z.record(z.any()).optional(),
}).strict();

const update = create.partial();

const list = z.object({
  q: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

module.exports = { idParam, create, update, list };
