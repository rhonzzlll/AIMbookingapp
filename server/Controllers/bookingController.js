const { Op, literal } = require('sequelize');
const db = require('../models');
const Booking = db.Booking;
const sequelize = db.sequelize; // <-- Add this line
const moment = require('moment'); // Install moment if not already installed

const BUFFER_MINUTES = 0; // Set to 15 or any value if you want buffer time applied

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get bookings by user ID
exports.getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.findAll({
      where: { userId },
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });

    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found for this user.' });
    }

    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Conflict check utility
const findOverlappingBooking = async ({ date, startTime, endTime, roomId, buildingId, excludeBookingId = null }) => {
  const whereClause = {
    roomId,
    buildingId,
    date,
    status: 'confirmed',
  };

  if (excludeBookingId) {
    whereClause.bookingId = { [Op.ne]: excludeBookingId };
  }

  if (BUFFER_MINUTES > 0) {
    return await Booking.findOne({
      where: {
        ...whereClause,
        [Op.and]: literal(`
          DATEADD(MINUTE, -${BUFFER_MINUTES}, startTime) < '${endTime}' AND
          DATEADD(MINUTE, ${BUFFER_MINUTES}, endTime) > '${startTime}'
        `),
      },
    });
  } else {
    return await Booking.findOne({
      where: {
        ...whereClause,
        [Op.or]: [
          {
            startTime: { [Op.lt]: endTime },
            endTime: { [Op.gt]: startTime },
          },
        ],
      },
    });
  }
};

// Helper to convert empty string to null
function cleanNull(val) {
  return val === '' ? null : val;
}

// Complete fix for createBooking function
exports.createBooking = async (req, res) => {
  try {
    const {
      roomId,
      userId,
      firstName,
      lastName,
      department,
      title,
      categoryId,
      buildingId,
      bookingCapacity,
      date,
      startTime,
      endTime,
      notes,
      isRecurring,
      isMealRoom,
      isBreakRoom,
      recurrenceEndDate,
      status,
      remarks,
    } = req.body;

    // Log the incoming data for debugging
    console.log('Incoming Data:', { date, startTime, endTime });

    // Validate required fields
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date, start time, and end time are required.' });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }

    // Validate time format (HH:mm:ss)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ 
        message: 'Times must be in HH:mm:ss format (24-hour).',
        startTime,
        endTime 
      });
    }

    // Check for overlapping bookings
    const overlappingBooking = await findOverlappingBooking({
      date,
      startTime,
      endTime,
      roomId,
      buildingId,
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: 'This time slot is unavailable due to an overlapping booking.',
      });
    }

    // Define booking data without timeSubmitted
    const bookingData = {
      roomId,
      userId,
      firstName,
      lastName,
      department,
      title,
      categoryId,
      buildingId,
      bookingCapacity,
      date,
      startTime,
      endTime,
      notes: cleanNull(notes),
      isRecurring: !!isRecurring,
      isMealRoom: isMealRoom || false,
      isBreakRoom: isBreakRoom || false,
      recurrenceEndDate: cleanNull(recurrenceEndDate),
      status: status || 'pending',
      remarks: cleanNull(remarks),
    };

    // Create the booking with raw query to handle timeSubmitted with SQL Server's GETDATE()
    const newBooking = await sequelize.transaction(async (t) => {
      // First create the booking record without timeSubmitted
      const booking = await Booking.create(bookingData, { transaction: t });
      
      // Then fetch the complete record including server-generated timeSubmitted
      return await Booking.findByPk(booking.bookingId, { transaction: t });
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking,
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Duplicate booking detected.' });
    }
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.reduce((acc, err) => {
        acc[err.path] = err.message;
        return acc;
      }, {});
      return res.status(400).json({
        message: 'Validation error',
        errors: validationErrors,
      });
    }
    res.status(500).json({ error: 'Failed to create booking', message: error.message });
  }
};
// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a booking
exports.updateBooking = async (req, res) => {
  try {
    const { startTime, endTime, roomId, buildingId, date } = req.body;

    if (startTime && endTime && roomId && buildingId && date) {
      const overlappingBooking = await findOverlappingBooking({
        date,
        startTime,
        endTime,
        roomId,
        buildingId,
        excludeBookingId: req.params.id,
      });

      if (overlappingBooking) {
        return res.status(400).json({
          message: 'Cannot update booking. This time conflicts with another booking.',
        });
      }
    }

    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await booking.update(req.body);
    const updatedBooking = await Booking.findByPk(req.params.id);
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await booking.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check availability
exports.checkAvailability = async (req, res) => {
  try {
    const { startTime, endTime, roomId, buildingId, categoryId, date } = req.body;

    if (!startTime || !endTime || !roomId || !buildingId || !categoryId || !date) {
      return res.status(400).json({
        message: 'All fields (startTime, endTime, roomId, buildingId, categoryId, date) are required for availability check.',
      });
    }

    const overlappingBooking = await findOverlappingBooking({ date, startTime, endTime, roomId, buildingId });

    if (overlappingBooking) {
      return res.status(200).json({
        available: false,
        message: 'This time slot is unavailable due to an overlapping booking.',
      });
    }

    res.status(200).json({ available: true, message: 'This time slot is available.' });
  } catch (error) {
    console.error('Check Availability Error:', error);
    res.status(500).json({ message: 'Failed to check availability.' });
  }
};
