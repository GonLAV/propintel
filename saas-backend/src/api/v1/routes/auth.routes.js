'use strict';

const { Router } = require('express');
const { validate } = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const { authLimiter } = require('../../../middleware/rateLimiter');
const ctrl = require('../controllers/auth.controller');
const v = require('../validators/auth.validator');

const router = Router();

router.post('/register', authLimiter, validate({ body: v.register }), ctrl.register);
router.post('/login',    authLimiter, validate({ body: v.login }),    ctrl.login);
router.post('/refresh',                validate({ body: v.refresh }), ctrl.refresh);
router.post('/logout',   authenticate, validate({ body: v.refresh }), ctrl.logout);
router.get('/me',        authenticate,                                ctrl.me);

router.post('/password/reset/request', authLimiter,
  validate({ body: v.requestPasswordReset }), ctrl.requestPasswordReset);
router.post('/password/reset/confirm', authLimiter,
  validate({ body: v.confirmPasswordReset }), ctrl.confirmPasswordReset);
router.post('/password/change', authenticate, authLimiter,
  validate({ body: v.changePassword }), ctrl.changePassword);

router.get('/invite/:token', authLimiter,
  validate({ params: v.inviteTokenParam }), ctrl.inviteInfo);
router.post('/invite/accept', authLimiter,
  validate({ body: v.acceptInvite }), ctrl.acceptInvite);

router.get('/oauth/google',          ctrl.googleStart);
router.get('/oauth/google/callback', ctrl.googleCallback);

module.exports = router;
