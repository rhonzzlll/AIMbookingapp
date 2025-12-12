const express = require('express');
const router = express.Router();
const bookingsController = require('../Controllers/bookingsController');

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings
 * @access  Private
 */
router.get('/', bookingsController.getAllBookings);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get a booking by ID
 * @access  Private
 */
router.get('/:id', bookingsController.getBookingById);

/**
 * @route   GET /api/bookings/user/:userId
 * @desc    Get all bookings for a specific user
 * @access  Private
 */
router.get('/user/:userId', bookingsController.getBookingsByUserId);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private
 */
router.post('/', bookingsController.createBooking);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Update an existing booking
 * @access  Private
 */
router.put('/:id', bookingsController.updateBooking);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Delete a booking
 * @access  Private
 */
router.delete('/:id', bookingsController.deleteBooking);

/**
 * @route   POST /api/bookings/check-availability
 * @desc    Check if a time slot is available
 * @access  Private
 */
router.post('/check-availability', bookingsController.checkAvailability);

router.get('/recurring-bookings/:recurringGroupId', bookingsController.getRecurringGroup);
// Get a single booking in a recurring group
router.get('/recurring-bookings/:recurringGroupId/:bookingId', bookingsController.getRecurringGroupBookingById);


router.patch('/:bookingId/cancel', bookingsController.cancelBooking);   
module.exports = router;