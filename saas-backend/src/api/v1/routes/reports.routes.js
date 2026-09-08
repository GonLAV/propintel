'use strict';

const { Router } = require('express');
const { authenticate, authorize } = require('../../../middleware/auth');
const enforceTenant = require('../../../middleware/tenant');
const { userLimiter } = require('../../../middleware/rateLimiter');
const { validate } = require('../../../middleware/validate');
const ctrl = require('../controllers/reports.controller');
const v = require('../validators/reports.validator');

const router = Router();
router.use(authenticate, enforceTenant, userLimiter);

router.get('/',
  authorize('owner', 'admin', 'member', 'viewer'),
  validate({ query: v.list }), ctrl.list);

router.post('/',
  authorize('owner', 'admin', 'member'),
  validate({ body: v.create }), ctrl.create);

router.get('/:id',
  authorize('owner', 'admin', 'member', 'viewer'),
  validate({ params: v.idParam }), ctrl.getById);

router.get('/:id/pdf',
  authorize('owner', 'admin', 'member', 'viewer'),
  validate({ params: v.idParam }), ctrl.downloadPdf);

router.delete('/:id',
  authorize('owner', 'admin'),
  validate({ params: v.idParam }), ctrl.softDelete);

module.exports = router;
