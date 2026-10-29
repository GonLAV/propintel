'use strict';

const { z } = require('zod');

const idParam = z.object({ id: z.string().uuid() }).strict();

const create = z.object({
  valuationId: z.string().uuid(),
  title: z.string().min(2).max(255),
  format: z.enum(['json', 'markdown', 'pdf']).default('json'),
  // Who ordered the appraisal + why — a property of the report (the same
  // property can be appraised for different clients/purposes over time),
  // not of the property itself. Both optional: an honest "not collected"
  // placeholder is rendered in the PDF when absent, never invented.
  clientName: z.string().min(1).max(255).optional(),
  purpose: z.string().min(1).max(255).optional(),
  // Appraiser's own professional narrative for the "עקרונות, גורמים
  // ושיקולים" section (תקן 1.1 §5.10) — additive to the factual summary the
  // system derives automatically from the actual valuation breakdown (see
  // extractPrinciplesSummary in reports.service.js). Optional free text,
  // same pattern as clientName/purpose.
  principlesNotes: z.string().max(4000).optional(),
}).strict();

const list = z.object({
  valuationId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

module.exports = { idParam, create, list };
