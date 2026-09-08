'use strict';

const { z } = require('zod');

const PROPERTY_TYPES = ['apartment', 'house', 'office', 'retail', 'land', 'other'];

const create = z.object({
  city: z.string().min(1).max(120),
  propertyType: z.enum(PROPERTY_TYPES),
  areaSqm: z.number().positive().max(1_000_000),
  rooms: z.number().min(0).max(50).optional(),
  floor: z.number().int().min(-5).max(200).optional(),
  yearBuilt: z.number().int().min(1700).max(2100).optional(),
  salePrice: z.number().positive(),
  currency: z.string().length(3).optional(),
  soldAt: z.coerce.date(),
  source: z.string().max(120).optional(),
  metadata: z.record(z.any()).optional(),
}).strict();

const list = z.object({
  city: z.string().min(1).max(120),
  propertyType: z.enum(PROPERTY_TYPES),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  sinceDays: z.coerce.number().int().min(1).max(3650).default(730),
}).strict();

module.exports = { create, list };
