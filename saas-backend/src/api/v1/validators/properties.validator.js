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
  // Legal parcel identifiers (גוש/חלקה/תת-חלקה) — required on a real
  // official appraisal (especially for a bank), optional here since a
  // gross-estimate case can proceed without them.
  block: z.string().max(32).optional(),
  parcel: z.string().max(32).optional(),
  subParcel: z.string().max(32).optional(),
  // Site-visit / determining date (מועד ביקור וקביעה) — separate from the
  // report-generation timestamp; a real appraiser visits once per case.
  visitDate: z.coerce.date().optional(),
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
