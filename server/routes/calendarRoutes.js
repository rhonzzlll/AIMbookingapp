const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// Route to get all calendar events
router.get('/', calendarController.getAllEvents);

// Route to create a new calendar event
router.post('/', calendarController.createEvent);

// Route to update a calendar event by ID
router.put('/:id', calendarController.updateEvent);

// Route to delete a calendar event by ID
router.delete('/:id', calendarController.deleteEvent);

// Route to get a specific calendar event by ID
router.get('/:id', calendarController.getEventById);

module.exports = router;