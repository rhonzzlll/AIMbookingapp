const express = require('express');
const router = express.Router();
const bookingsController = require('../Controllers/bookingsController');
 
router.get('/', bookingsController.getAllBookings);

 
router.get('/user/:userId', bookingsController.getBookingsByUserId);
 
router.get('/:id', bookingsController.getBookingById);

// Route to create a new booking
router.post('/', bookingsController.createBooking);

// Route to update a booking by ID
router.put('/:id', bookingsController.updateBooking);

// Route to delete a booking by ID
router.delete('/:id', bookingsController.deleteBooking);

// Route to check availability
router.post('/check-availability', bookingsController.checkAvailability);

module.exports = router;
