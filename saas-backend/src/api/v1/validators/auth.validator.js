'use strict';

const { z } = require('zod');

const password = z.string().min(10).max(128).refine(
  (s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s),
  'Password must contain upper, lower, and digit',
);

const email = z.string().email().max(254).toLowerCase();

const register = z.object({
  email,
  password,
  fullName: z.string().min(1).max(120),
  tenantName: z.string().min(2).max(120),
  tenantSlug: z.string().min(2).max(64).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  // Appraiser license number (מספר רישיון שמאי) — a property of the
  // individual, not the tenant/office. Optional: a report signature block
  // falls back to a generic label when it isn't provided.
  licenseNumber: z.string().min(1).max(64).optional(),
}).strict();

const login = z.object({
  email,
  password: z.string().min(1).max(128),
  tenantSlug: z.string().min(2).max(64).optional(),
}).strict();

const refresh = z.object({
  refreshToken: z.string().min(20).max(2048),
}).strict();

const requestPasswordReset = z.object({
  email,
  tenantSlug: z.string().min(2).max(64).optional(),
}).strict();

const confirmPasswordReset = z.object({
  token: z.string().min(20).max(512),
  newPassword: password,
}).strict();

module.exports = { register, login, refresh, requestPasswordReset, confirmPasswordReset };
