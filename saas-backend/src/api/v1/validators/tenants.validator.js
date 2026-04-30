'use strict';

const { z } = require('zod');

const update = z.object({
  name: z.string().min(2).max(120).optional(),
}).strict();

module.exports = { update };
