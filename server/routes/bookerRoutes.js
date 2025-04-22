const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/Controller');

// Define routes and attach controller methods
router.post('/delete', tenantController.deleteTenant);
router.post('/create', tenantController.createTenant);
router.post('/update', tenantController.updateTenant);
router.get('/get/:id', tenantController.getTenant); // This should match the fetch URL

module.exports = router;