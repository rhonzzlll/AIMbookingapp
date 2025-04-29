const express = require('express');
const router = express.Router();
const bookingsController = require('../Controllers/bookingsController');

// Route to get all bookings
router.get('/', bookingsController.getAllBookings);

// ✅ Route to get bookings by user ID
router.get('/user/:userId', bookingsController.getBookingsByUserId);

// Route to get a specific booking by booking ID
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
