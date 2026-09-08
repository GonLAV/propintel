'use strict';

const { Router } = require('express');

const router = Router();
router.use('/docs',       require('./docs.routes'));
router.use('/auth',       require('./auth.routes'));
router.use('/users',      require('./users.routes'));
router.use('/tenants',    require('./tenants.routes'));
router.use('/properties', require('./properties.routes'));
router.use('/valuations', require('./valuations.routes'));
router.use('/reports',    require('./reports.routes'));

module.exports = router;
