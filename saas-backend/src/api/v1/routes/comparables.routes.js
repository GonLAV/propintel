'use strict';

const { Router } = require('express');
const { authenticate, authorize } = require('../../../middleware/auth');
const enforceTenant = require('../../../middleware/tenant');
const { userLimiter } = require('../../../middleware/rateLimiter');
const { validate } = require('../../../middleware/validate');
const ctrl = require('../controllers/comparables.controller');
const v = require('../validators/comparables.validator');

const router = Router();
router.use(authenticate, enforceTenant, userLimiter);

router.get('/',
  authorize('owner', 'admin', 'member', 'viewer'),
  validate({ query: v.list }), ctrl.list);

router.post('/',
  authorize('owner', 'admin', 'member'),
  validate({ body: v.create }), ctrl.create);

module.exports = router;
