const { Op } = require('sequelize');
const db = require('../models'); // Assuming your Sequelize models are in this directory
const Booking = db.Booking;

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

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    console.log('Request body received:', req.body); // Debug log to see incoming data
    
    // Destructure bookingId to prevent issues with auto-increment
    const { bookingId, startTime, endTime, roomId, buildingId, userId, isRecurring, recurrenceEndDate, ...cleanedData } = req.body;

    if (!startTime || !endTime || !userId || !roomId || !buildingId) {
      return res.status(400).json({ 
        message: 'Start time, end time, userId, roomId, and buildingId are required.',
        missingFields: {
          startTime: !startTime,
          endTime: !endTime,
          userId: !userId,
          roomId: !roomId,
          buildingId: !buildingId
        }
      });
    }

    // Parse the dates
    const parsedDate = new Date(req.body.date);
    const parsedStartTime = new Date(`${req.body.date}T${startTime}`);
    const parsedEndTime = new Date(`${req.body.date}T${endTime}`);

    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time format.' });
    }

    // Convert start and end times to formatted strings for buffer calculations
    const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
    const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

    // FIXED: Validate conflicts for the initial booking - look only for confirmed bookings
    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        buildingId,
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
      return res.status(400).json({
        message: 'This time slot is unavailable due to the 30-minute buffer rule.',
      });
    }

    // Handle recurring bookings
    if (isRecurring && recurrenceEndDate) {
      const recurrenceEnd = new Date(recurrenceEndDate);
      const bookings = [];

      let currentDate = new Date(parsedDate);
      const recurrenceType = req.body.recurrenceType || 'Weekly'; // Default to Weekly if not specified

      while (currentDate <= recurrenceEnd) {
        const bookingData = {
          ...cleanedData,
          userId,
          roomId,
          buildingId,
          date: new Date(currentDate),
          startTime,
          endTime,
          isRecurring: true,
          recurrenceEndDate
        };

        bookings.push(bookingData);

        // Adjust date based on recurrence type
        if (recurrenceType === 'Daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (recurrenceType === 'Weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurrenceType === 'Monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      await Booking.bulkCreate(bookings);
      return res.status(201).json({ message: 'Recurring bookings created successfully.' });
    }

    // Save the single booking
    const newBooking = await Booking.create({
      ...cleanedData,
      userId,
      roomId,
      buildingId,
      date: parsedDate,
      startTime,
      endTime,
      isRecurring: !!isRecurring
    });

    console.log('Booking saved:', newBooking); // Debug log

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
      // Extract validation error details
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
    const { startTime, endTime, roomId, buildingId } = req.body;

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

    // Update the booking
    await booking.update(req.body);
    
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