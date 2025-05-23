const { Op } = require('sequelize');
const db = require('../models');
const Booking = db.Booking;
const { v4: uuidv4 } = require('uuid'); // For unique recurrenceGroupId

const convertTo24HourFormat = (time) => {
  const [hourMinute, period] = time.split(' ');
  let [hour, minute] = hourMinute.split(':').map(Number);

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// Helper to generate all dates for recurrence
function generateRecurrenceDates(startDate, endDate, pattern) {
  const dates = [];
  let current = new Date(startDate);
  endDate = new Date(endDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    if (pattern === 'Daily') {
      current.setDate(current.getDate() + 1);
    } else if (pattern === 'Weekly') {
      current.setDate(current.getDate() + 7);
    } else if (pattern === 'Monthly') {
      const prevDay = current.getDate();
      current.setMonth(current.getMonth() + 1);
      // Handle months with fewer days
      if (current.getDate() < prevDay) {
        current.setDate(0); // Last day of previous month
      }
    } else {
      break;
    }
  }
  return dates;
}

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.findAll({ 
      where: { userId },
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user.' });
    }

    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create a new booking (single or recurring)
exports.createBooking = async (req, res) => {
  try {
    const {
      startTime, endTime, roomId, buildingId, userId,
      isRecurring, recurrenceEndDate, recurrencePattern,
      ...cleanedData
    } = req.body;

    if (!startTime || !endTime || !userId || !roomId || !buildingId) {
      return res.status(400).json({
        message: 'Start time, end time, userId, roomId, and buildingId are required.'
      });
    }

    const parsedDate = new Date(req.body.date);

    // Helper to check for conflicts
    async function hasConflict(date, startTime, endTime) {
      const bufferStartTime = new Date(startTime.getTime() - 30 * 60 * 1000);
      const bufferEndTime = new Date(endTime.getTime() + 30 * 60 * 1000);
      return await Booking.findOne({
        where: {
          roomId,
          buildingId,
          date,
          status: 'confirmed',
          [Op.or]: [
            {
              startTime: { [Op.lte]: bufferStartTime.toTimeString().substring(0, 8) },
              endTime: { [Op.gt]: bufferStartTime.toTimeString().substring(0, 8) }
            },
            {
              startTime: { [Op.lt]: bufferEndTime.toTimeString().substring(0, 8) },
              endTime: { [Op.gte]: bufferEndTime.toTimeString().substring(0, 8) }
            },
            {
              startTime: { [Op.gte]: bufferStartTime.toTimeString().substring(0, 8) },
              endTime: { [Op.lte]: bufferEndTime.toTimeString().substring(0, 8) }
            },
            {
              startTime: { [Op.lte]: bufferStartTime.toTimeString().substring(0, 8) },
              endTime: { [Op.gte]: bufferEndTime.toTimeString().substring(0, 8) }
            }
          ]
        }
      });
    }

    // Handle recurring bookings as a single record
    if (isRecurring && recurrenceEndDate && recurrencePattern) {
      const pattern = recurrencePattern;
      const recurrenceDates = generateRecurrenceDates(req.body.date, recurrenceEndDate, pattern);

      // Check all occurrences for conflicts
      for (let dateObj of recurrenceDates) {
        // Use the same start/end time for each date
        const occurrenceDate = new Date(dateObj);
        const occurrenceStart = new Date(`${occurrenceDate.toISOString().split('T')[0]}T${startTime}`);
        const occurrenceEnd = new Date(`${occurrenceDate.toISOString().split('T')[0]}T${endTime}`);

        const conflict = await hasConflict(occurrenceDate, occurrenceStart, occurrenceEnd);
        if (conflict) {
          return res.status(400).json({
            message: `Conflict detected for recurring booking on ${occurrenceDate.toISOString().split('T')[0]}.`,
          });
        }
      }

      // No conflicts, create the recurring booking
      const parsedEndDate = new Date(recurrenceEndDate);
      const booking = await Booking.create({
        ...cleanedData,
        userId,
        roomId,
        buildingId,
        date: parsedDate,
        startTime,
        endTime,
        isRecurring: true,
        recurrencePattern: pattern,
        recurrenceEndDate: parsedEndDate,
        recurrenceGroupId: uuidv4(),
        timeSubmitted: new Date()
      });

      return res.status(201).json({
        message: 'Recurring booking created as a single series.',
        booking,
      });
    }

    // Save the single booking
    const thisStartTime = new Date(`${req.body.date}T${startTime}`);
    const thisEndTime = new Date(`${req.body.date}T${endTime}`);
    const conflict = await hasConflict(parsedDate, thisStartTime, thisEndTime);
    if (conflict) {
      return res.status(400).json({
        message: 'Conflict detected for this booking.',
      });
    }

    const newBooking = await Booking.create({
      ...cleanedData,
      userId,
      roomId,
      buildingId,
      date: parsedDate,
      startTime,
      endTime,
      isRecurring: !!isRecurring,
      timeSubmitted: new Date()
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
        errors: validationErrors
      });
    }
    res.status(500).json({ error: 'Failed to create booking', message: error.message });
  }
};

// Get a booking by ID
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
    const { startTime, endTime, roomId, buildingId, status, declineReason } = req.body;

    if (startTime && endTime && roomId && buildingId) {
      const parsedDate = new Date(req.body.date);
      const parsedStartTime = new Date(`${req.body.date}T${startTime}`);
      const parsedEndTime = new Date(`${req.body.date}T${endTime}`);

      if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
        return res.status(400).json({ message: 'Invalid date format for start or end time' });
      }

      const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
      const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

      // FIXED: Only check for confirmed status bookings
      const overlappingBooking = await Booking.findOne({
        where: {
          bookingId: { [Op.ne]: req.params.id },  // Not equal to current booking ID
          roomId,
          buildingId,
          date: parsedDate,
          status: 'confirmed',
          [Op.or]: [
            {
              startTime: { [Op.lte]: bufferStartTime.toTimeString().substring(0, 8) },
              endTime: { [Op.gt]: bufferStartTime.toTimeString().substring(0, 8) }
            },
            {
              startTime: { [Op.lt]: bufferEndTime.toTimeString().substring(0, 8) },
              endTime: { [Op.gte]: bufferEndTime.toTimeString().substring(0, 8) }
            },
            {
              startTime: { [Op.gte]: bufferStartTime.toTimeString().substring(0, 8) },
              endTime: { [Op.lte]: bufferEndTime.toTimeString().substring(0, 8) }
            },
            {
              startTime: { [Op.lte]: bufferStartTime.toTimeString().substring(0, 8) },
              endTime: { [Op.gte]: bufferEndTime.toTimeString().substring(0, 8) }
            }
          ]
        }
      });

      if (overlappingBooking) {
        return res.status(400).json({
          message: 'Cannot update booking. This time conflicts with another booking due to the 30-minute buffer rule.',
        });
      }
    }

    // Find the booking first
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Prepare update data
    const updateData = { ...req.body };

    // If status is declined, set declineReason; otherwise, clear it
    if (status === 'declined') {
      updateData.declineReason = declineReason || '';
    } else if (typeof declineReason !== 'undefined') {
      updateData.declineReason = null;
    }

    // Update the booking
    await booking.update(updateData);
    
    // Return the updated booking
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
    console.log('Received Payload for Availability Check:', req.body); // Debugging log

    const { startTime, endTime, roomId, buildingId, categoryId } = req.body;

    if (!startTime || !endTime || !roomId || !buildingId || !categoryId) {
      return res.status(400).json({ message: 'All fields (startTime, endTime, roomId, buildingId, categoryId) are required for availability check.' });
    }

    const parsedDate = new Date(req.body.date);
    const parsedStartTime = new Date(`${req.body.date}T${startTime}`);
    const parsedEndTime = new Date(`${req.body.date}T${endTime}`);

    if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
    const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        buildingId,
        categoryId,
        date: parsedDate,
        status: 'confirmed', // Status is now an ENUM in Sequelize, so case sensitivity is handled
        [Op.or]: [
          {
            startTime: { [Op.lte]: bufferStartTime.toTimeString().substring(0, 8) },
            endTime: { [Op.gt]: bufferStartTime.toTimeString().substring(0, 8) }
          },
          {
            startTime: { [Op.lt]: bufferEndTime.toTimeString().substring(0, 8) },
            endTime: { [Op.gte]: bufferEndTime.toTimeString().substring(0, 8) }
          },
          {
            startTime: { [Op.gte]: bufferStartTime.toTimeString().substring(0, 8) },
            endTime: { [Op.lte]: bufferEndTime.toTimeString().substring(0, 8) }
          },
          {
            startTime: { [Op.lte]: bufferStartTime.toTimeString().substring(0, 8) },
            endTime: { [Op.gte]: bufferEndTime.toTimeString().substring(0, 8) }
          }
        ]
      }
    });

    if (overlappingBooking) {
      return res.status(200).json({
        available: false,
        message: 'This time slot is unavailable due to an already confirmed booking (30-minute buffer rule applies).',
      });
    }

    return res.status(200).json({ available: true, message: 'This time slot is available.' });
  } catch (error) {
    console.error('Check Availability Error:', error);
    res.status(500).json({ message: 'Failed to check availability.' });
  }
};

// Get all bookings in a recurring group
exports.getRecurringGroup = async (req, res) => {
  try {
    const { recurringGroupId } = req.params;
    if (!recurringGroupId) {
      return res.status(400).json({ message: 'recurringGroupId is required.' });
    }

    const bookings = await Booking.findAll({
      where: { recurringGroupId }
    });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this recurring group.' });
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single booking in a recurring group by recurringGroupId and bookingId
exports.getRecurringGroupBookingById = async (req, res) => {
  try {
    const { recurringGroupId, bookingId } = req.params;
    if (!recurringGroupId || !bookingId) {
      return res.status(400).json({ message: 'recurringGroupId and bookingId are required.' });
    }

    const booking = await Booking.findOne({
      where: { recurringGroupId, bookingId }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found in this recurring group.' });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel a booking (PATCH /api/bookings/:bookingId/cancel)
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow cancelling if status is pending
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be cancelled.' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
};