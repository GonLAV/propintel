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
  // Legal rights status (מצב משפטי) and planning status (מצב תכנוני) — both
  // required sections per תקן 1.1 §4/5.8. Free text: the appraiser transcribes
  // the relevant facts from the land registry extract (נסח טאבו) and the
  // planning authority themselves; this product doesn't integrate with those
  // registries, so it gives the appraiser a place to record findings rather
  // than inventing automated lookups it can't actually perform.
  legalRightsNotes: z.string().max(4000).optional(),
  planningStatusNotes: z.string().max(4000).optional(),
  metadata: z.record(z.any()).optional(),
}).strict();

// Editing a property (unlike creating one) needs to be able to clear a
// previously-set optional field, not just leave it unspecified -- .partial()
// alone only allows omitting a key, Zod's .optional() does not accept
// `null`. Re-declare the clearable text fields as explicitly nullable here.
const update = create.partial().extend({
  block: z.string().max(32).nullable().optional(),
  parcel: z.string().max(32).nullable().optional(),
  subParcel: z.string().max(32).nullable().optional(),
  legalRightsNotes: z.string().max(4000).nullable().optional(),
  planningStatusNotes: z.string().max(4000).nullable().optional(),
});

const list = z.object({
  q: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

module.exports = { idParam, create, update, list };
