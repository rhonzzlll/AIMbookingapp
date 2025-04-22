const Booking = require('../models/Bookings');

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
    const bookings = await Booking.find();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get bookings by userId
exports.getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const bookings = await Booking.find({ userId }).sort({ date: 1, startTime: 1 });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user.' });
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    console.log('Request body received:', req.body); // Debug log to see incoming data
    
    // Destructure _id from body to prevent duplicate key error
    const { _id, startTime, endTime, room, building, userId, recurring, recurrenceEndDate, ...cleanedData } = req.body;

    if (!startTime || !endTime || !userId || !room || !building) {
      return res.status(400).json({ 
        message: 'Start time, end time, userId, room, and building are required.',
        missingFields: {
          startTime: !startTime,
          endTime: !endTime,
          userId: !userId,
          room: !room,
          building: !building
        }
      });
    }

    // Parse the dates
    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time format.' });
    }

    // Validate conflicts for the initial booking
    const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
    const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

    const overlappingBooking = await Booking.findOne({
      room,
      building,
      $or: [
        { startTime: { $lte: bufferStartTime }, endTime: { $gt: bufferStartTime } },
        { startTime: { $lt: bufferEndTime }, endTime: { $gte: bufferEndTime } },
        { startTime: { $gte: bufferStartTime }, endTime: { $lte: bufferEndTime } },
        { startTime: { $lte: bufferStartTime }, endTime: { $gte: bufferEndTime } },
      ],
      status: { $in: ['approved', 'pending'] },
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: 'This time slot is unavailable due to the 30-minute buffer rule.',
      });
    }

    // Handle recurring bookings
    if (recurring !== 'No' && recurrenceEndDate) {
      const recurrenceEnd = new Date(recurrenceEndDate);
      const recurrenceType = recurring;

      let currentDate = new Date(parsedStartTime);
      const bookings = [];

      while (currentDate <= recurrenceEnd) {
        const currentEndTime = new Date(currentDate.getTime() + (parsedEndTime - parsedStartTime));

        bookings.push({
          ...cleanedData,
          userId,
          room,
          building,
          startTime: currentDate,
          endTime: currentEndTime,
        });

        if (recurrenceType === 'Daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (recurrenceType === 'Weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurrenceType === 'Monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      await Booking.insertMany(bookings);
      return res.status(201).json({ message: 'Recurring bookings created successfully.' });
    }

    // Save the single booking
    const newBooking = new Booking({
      ...cleanedData,
      userId,
      room, // Explicitly include room
      building, // Explicitly include building
      startTime: parsedStartTime,
      endTime: parsedEndTime,
    });

    console.log('Booking to be saved:', newBooking); // Debug log

    await newBooking.save();

    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking,
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate booking detected.' });
    }
    if (error.name === 'ValidationError') {
      // Extract validation error details
      const validationErrors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
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
    const booking = await Booking.findById(req.params.id);
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
    const { startTime, endTime, room, building } = req.body;

    if (startTime && endTime && room && building) {
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);

      if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
        return res.status(400).json({ message: 'Invalid date format for start or end time' });
      }

      const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
      const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

      const overlappingBooking = await Booking.findOne({
        _id: { $ne: req.params.id },
        room,
        building,
        $or: [
          { startTime: { $lte: bufferStartTime }, endTime: { $gt: bufferStartTime } },
          { startTime: { $lt: bufferEndTime }, endTime: { $gte: bufferEndTime } },
          { startTime: { $gte: bufferStartTime }, endTime: { $lte: bufferEndTime } },
          { startTime: { $lte: bufferStartTime }, endTime: { $gte: bufferEndTime } },
        ],
        status: { $in: ['approved', 'pending'] },
      });

      if (overlappingBooking) {
        return res.status(400).json({
          message: 'Cannot update booking. This time conflicts with another booking due to the 30-minute buffer rule.',
        });
      }
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check availability
exports.checkAvailability = async (req, res) => {
  try {
    console.log('Received Payload for Availability Check:', req.body); // Debugging log

    const { startTime, endTime, room, building, category } = req.body;

    if (!startTime || !endTime || !room || !building || !category) {
      return res.status(400).json({ message: 'All fields (startTime, endTime, room, building, category) are required for availability check.' });
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
    const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

    const overlappingBooking = await Booking.findOne({
      room,
      building,
      category, // Include category in the query if necessary
      $or: [
        { startTime: { $lte: bufferStartTime }, endTime: { $gt: bufferStartTime } },
        { startTime: { $lt: bufferEndTime }, endTime: { $gte: bufferEndTime } },
        { startTime: { $gte: bufferStartTime }, endTime: { $lte: bufferEndTime } },
        { startTime: { $lte: bufferStartTime }, endTime: { $gte: bufferEndTime } },
      ],
      status: { $in: ['approved', 'pending'] },
    });

    if (overlappingBooking) {
      return res.status(200).json({
        available: false,
        message: 'This time slot is unavailable due to the 30-minute buffer rule.',
      });
    }

    return res.status(200).json({ available: true, message: 'This time slot is available.' });
  } catch (error) {
    console.error('Check Availability Error:', error); // Debugging log
    res.status(500).json({ message: 'Failed to check availability.' });
  }
};