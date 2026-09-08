'use strict';

const { Router } = require('express');
const { authenticate, authorize } = require('../../../middleware/auth');
const enforceTenant = require('../../../middleware/tenant');
const { userLimiter } = require('../../../middleware/rateLimiter');
const { validate } = require('../../../middleware/validate');
const ctrl = require('../controllers/users.controller');
const v = require('../validators/users.validator');

const router = Router();
router.use(authenticate, enforceTenant, userLimiter);

router.get('/',
  authorize('owner', 'admin', 'member', 'viewer'),
  validate({ query: v.list }), ctrl.list);

router.get('/:id',
  authorize('owner', 'admin', 'member', 'viewer'),
  validate({ params: v.idParam }), ctrl.getById);

router.patch('/:id',
  authorize('owner', 'admin'),
  validate({ params: v.idParam, body: v.update }), ctrl.update);

router.patch('/:id/role',
  authorize('owner', 'admin'),
  validate({ params: v.idParam, body: v.changeRole }), ctrl.changeRole);

router.delete('/:id',
  authorize('owner', 'admin'),
  validate({ params: v.idParam }), ctrl.softDelete);

module.exports = router;
