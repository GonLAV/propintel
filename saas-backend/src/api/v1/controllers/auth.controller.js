'use strict';

const config = require('../../../config');
const authService = require('../services/auth.service');
const passwordResetService = require('../services/passwordReset.service');
const { writeAudit } = require('../../../utils/audit');
const { NotFound } = require('../../../utils/errors');
const usersRepo = require('../repositories/users.repository');
const tenantsRepo = require('../repositories/tenants.repository');

const ipOf = (req) => req.ip;
const uaOf = (req) => req.headers['user-agent'] || null;

async function register(req, res, next) {
  try {
    const result = await authService.register({
      ...req.body, ip: ipOf(req), userAgent: uaOf(req),
    });
    await writeAudit({
      tenantId: result.tenant.id, userId: result.user.id, action: 'auth.register',
      entity: 'user', entityId: result.user.id, ip: ipOf(req), userAgent: uaOf(req),
    });
    res.status(201).json({
      user: result.user,
      tenant: result.tenant,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const result = await authService.login({
      ...req.body, ip: ipOf(req), userAgent: uaOf(req),
    });
    await writeAudit({
      tenantId: result.user.tenantId, userId: result.user.id, action: 'auth.login.success',
      entity: 'user', entityId: result.user.id, ip: ipOf(req), userAgent: uaOf(req),
    });
    res.json(result);
  } catch (err) {
    if (err && err.status === 401) {
      await writeAudit({
        action: 'auth.login.failure', ip: ipOf(req), userAgent: uaOf(req),
        metadata: { email: req.body && req.body.email },
      });
    }
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh({
      refreshToken: req.body.refreshToken, ip: ipOf(req), userAgent: uaOf(req),
    });
    res.json(result);
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    await authService.logout({ refreshToken: req.body.refreshToken });
    await writeAudit({
      tenantId: req.user.tenantId, userId: req.user.id, action: 'auth.logout',
      ip: ipOf(req), userAgent: uaOf(req),
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

async function me(req, res, next) {
  try {
    const u = await usersRepo.findById(req.user.tenantId, req.user.id);
    if (!u) throw NotFound('User not found');
    const t = await tenantsRepo.findById(req.user.tenantId);
    res.json({ user: u, tenant: t });
  } catch (err) { next(err); }
}

async function googleStart(req, res) {
  if (!config.oauth.google.clientId) {
    return res.status(501).json({
      error: { code: 'NOT_IMPLEMENTED', message: 'Google OAuth not configured' },
    });
  }
  const params = new URLSearchParams({
    client_id: config.oauth.google.clientId,
    redirect_uri: config.oauth.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

async function googleCallback(req, res) {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Implement Google OAuth code exchange here' },
  });
}

async function requestPasswordReset(req, res, next) {
  try {
    await passwordResetService.requestReset({
      email: req.body.email,
      tenantSlug: req.body.tenantSlug,
      ip: ipOf(req), userAgent: uaOf(req),
    });
    await writeAudit({
      action: 'auth.password_reset.requested',
      ip: ipOf(req), userAgent: uaOf(req),
      metadata: { email: req.body.email },
    });
    // Always 202 to prevent enumeration.
    res.status(202).json({ ok: true });
  } catch (err) { next(err); }
}

async function confirmPasswordReset(req, res, next) {
  try {
    const out = await passwordResetService.confirmReset({
      token: req.body.token, newPassword: req.body.newPassword,
    });
    await writeAudit({
      tenantId: out.tenantId, userId: out.userId,
      action: 'auth.password_reset.confirmed',
      ip: ipOf(req), userAgent: uaOf(req),
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = {
  register, login, refresh, logout, me,
  googleStart, googleCallback,
  requestPasswordReset, confirmPasswordReset,
};
