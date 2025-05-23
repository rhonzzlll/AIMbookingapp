const express = require('express');
const router = express.Router();
const bookingsController = require('../Controllers/bookingsController');

// ...existing routes...

// Add this route for recurring group fetch
router.get('/recurring-bookings/:recurringGroupId', bookingsController.getRecurringGroup);

module.exports = router;