'use strict';

const { Router } = require('express');
const { authenticate, authorize } = require('../../../middleware/auth');
const enforceTenant = require('../../../middleware/tenant');
const { userLimiter } = require('../../../middleware/rateLimiter');
const { validate } = require('../../../middleware/validate');
const ctrl = require('../controllers/tenants.controller');
const v = require('../validators/tenants.validator');

const router = Router();
router.use(authenticate, enforceTenant, userLimiter);

router.get('/me',
  authorize('owner', 'admin', 'member', 'viewer'), ctrl.getMine);

router.patch('/me',
  authorize('owner'), validate({ body: v.update }), ctrl.updateMine);

module.exports = router;
