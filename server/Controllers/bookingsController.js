const { Op } = require('sequelize');

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
    const db = req.app.get('db');
    const Booking = db.Booking;
    
    const bookings = await Booking.findAll();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.get('db');
    const Booking = db.Booking;

    const bookings = await Booking.findAll({ 
      where: { userId },
      order: [['date', 'ASC'], ['startTime', 'ASC']]
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
    
    const db = req.app.get('db');
    const Booking = db.Booking;
    
    // Extract data from request body
    const { 
      startTime, 
      endTime, 
      roomId, 
      userId, 
      isRecurring, 
      recurrenceEndDate, 
      title,
      bookingCapacity,
      date,
      notes,
      isMealRoom,
      isBreakRoom,
      status,
      remarks,
      changedBy
    } = req.body;

    if (!startTime || !endTime || !userId || !roomId) {
      return res.status(400).json({ 
        message: 'Start time, end time, userId, and roomId are required.',
        missingFields: {
          startTime: !startTime,
          endTime: !endTime,
          userId: !userId,
          roomId: !roomId
        }
      });
    }

    // Parse the date components
    const bookingDate = date ? new Date(date) : null;
    const parsedStartTime = startTime;
    const parsedEndTime = endTime;

    // FIXED: Validate conflicts for the initial booking - look only for confirmed bookings
    // Calculate buffer times for SQL Server (using string manipulation for time values)
    const startTimeObj = new Date(`1970-01-01T${parsedStartTime}`);
    const endTimeObj = new Date(`1970-01-01T${parsedEndTime}`);
    
    // Subtract 30 minutes from start time
    startTimeObj.setMinutes(startTimeObj.getMinutes() - 30);
    const bufferStartTime = startTimeObj.toTimeString().split(' ')[0].substring(0, 8);
    
    // Add 30 minutes to end time
    endTimeObj.setMinutes(endTimeObj.getMinutes() + 30);
    const bufferEndTime = endTimeObj.toTimeString().split(' ')[0].substring(0, 8);

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        date: bookingDate,
        status: { [Op.iLike]: 'confirmed' },
        [Op.or]: [
          { 
            startTime: { [Op.lte]: bufferStartTime },
            endTime: { [Op.gt]: bufferStartTime }
          },
          {
            startTime: { [Op.lt]: bufferEndTime },
            endTime: { [Op.gte]: bufferEndTime }
          },
          {
            startTime: { [Op.gte]: bufferStartTime },
            endTime: { [Op.lte]: bufferEndTime }
          },
          {
            startTime: { [Op.lte]: bufferStartTime },
            endTime: { [Op.gte]: bufferEndTime }
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
      const currentDate = new Date(bookingDate);
      const bookings = [];

      // Create an array of booking dates
      while (currentDate <= recurrenceEnd) {
        bookings.push({
          title,
          userId,
          roomId,
          bookingCapacity,
          date: new Date(currentDate),
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          notes,
          isRecurring: true,
          isMealRoom: isMealRoom || false,
          isBreakRoom: isBreakRoom || false,
          recurrenceEndDate,
          status: status || 'pending',
          timeSubmitted: new Date().toTimeString().split(' ')[0].substring(0, 8),
          remarks,
          changedBy
        });

        // Increment date based on recurrence type (assuming daily recurrence)
        // You might need to customize this based on your recurrence logic
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Bulk create the recurring bookings
      await Booking.bulkCreate(bookings);
      return res.status(201).json({ message: 'Recurring bookings created successfully.' });
    }

    // Save the single booking
    const newBooking = await Booking.create({
      title,
      userId,
      roomId,
      bookingCapacity,
      date: bookingDate,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      notes,
      isRecurring: isRecurring || false,
      isMealRoom: isMealRoom || false,
      isBreakRoom: isBreakRoom || false,
      recurrenceEndDate,
      status: status || 'pending',
      timeSubmitted: new Date().toTimeString().split(' ')[0].substring(0, 8),
      remarks,
      changedBy
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
    const db = req.app.get('db');
    const Booking = db.Booking;
    
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
    const db = req.app.get('db');
    const Booking = db.Booking;
    
    const { startTime, endTime, roomId, date } = req.body;

    if (startTime && endTime && roomId && date) {
      const bookingDate = new Date(date);
      
      // Calculate buffer times for SQL Server
      const startTimeObj = new Date(`1970-01-01T${startTime}`);
      const endTimeObj = new Date(`1970-01-01T${endTime}`);
      
      // Subtract 30 minutes from start time
      startTimeObj.setMinutes(startTimeObj.getMinutes() - 30);
      const bufferStartTime = startTimeObj.toTimeString().split(' ')[0].substring(0, 8);
      
      // Add 30 minutes to end time
      endTimeObj.setMinutes(endTimeObj.getMinutes() + 30);
      const bufferEndTime = endTimeObj.toTimeString().split(' ')[0].substring(0, 8);

      // FIXED: Only check for confirmed status bookings
      const overlappingBooking = await Booking.findOne({
        where: {
          bookingId: { [Op.ne]: req.params.id }, // Not the current booking
          roomId,
          date: bookingDate,
          status: { [Op.iLike]: 'confirmed' },
          [Op.or]: [
            { 
              startTime: { [Op.lte]: bufferStartTime },
              endTime: { [Op.gt]: bufferStartTime }
            },
            {
              startTime: { [Op.lt]: bufferEndTime },
              endTime: { [Op.gte]: bufferEndTime }
            },
            {
              startTime: { [Op.gte]: bufferStartTime },
              endTime: { [Op.lte]: bufferEndTime }
            },
            {
              startTime: { [Op.lte]: bufferStartTime },
              endTime: { [Op.gte]: bufferEndTime }
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

    // Find the booking first to ensure it exists
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update the booking with new values
    await booking.update(req.body);
    
    // Fetch the updated booking to return
    const updatedBooking = await Booking.findByPk(req.params.id);
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a booking 
exports.deleteBooking = async (req, res) => {
  try {
    const db = req.app.get('db');
    const Booking = db.Booking;
    
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
    
    const db = req.app.get('db');
    const Booking = db.Booking;

    const { startTime, endTime, roomId, date, category } = req.body;

    if (!startTime || !endTime || !roomId || !date || !category) {
      return res.status(400).json({ message: 'All fields (startTime, endTime, roomId, date, category) are required for availability check.' });
    }

    const bookingDate = new Date(date);
    
    // Calculate buffer times for SQL Server
    const startTimeObj = new Date(`1970-01-01T${startTime}`);
    const endTimeObj = new Date(`1970-01-01T${endTime}`);
    
    // Subtract 30 minutes from start time
    startTimeObj.setMinutes(startTimeObj.getMinutes() - 30);
    const bufferStartTime = startTimeObj.toTimeString().split(' ')[0].substring(0, 8);
    
    // Add 30 minutes to end time
    endTimeObj.setMinutes(endTimeObj.getMinutes() + 30);
    const bufferEndTime = endTimeObj.toTimeString().split(' ')[0].substring(0, 8);

    // Use Room model association if needed for category check
    // For now, assuming category is a direct property of the booking or not needed
    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        date: bookingDate,
        status: { [Op.iLike]: 'confirmed' },
        [Op.or]: [
          { 
            startTime: { [Op.lte]: bufferStartTime },
            endTime: { [Op.gt]: bufferStartTime }
          },
          {
            startTime: { [Op.lt]: bufferEndTime },
            endTime: { [Op.gte]: bufferEndTime }
          },
          {
            startTime: { [Op.gte]: bufferStartTime },
            endTime: { [Op.lte]: bufferEndTime }
          },
          {
            startTime: { [Op.lte]: bufferStartTime },
            endTime: { [Op.gte]: bufferEndTime }
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