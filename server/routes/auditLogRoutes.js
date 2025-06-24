const express = require('express');
const router = express.Router();
const auditLogController = require('../Controllers/auditLogController');

router.get('/audit-trail', auditLogController.getAuditTrail);

module.exports = router;