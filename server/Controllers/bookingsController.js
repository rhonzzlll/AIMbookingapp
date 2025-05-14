const { Op, literal } = require('sequelize'); // Added literal from sequelize

// Convert 12-hour time (e.g., "2:30 PM") to 24-hour format (e.g., "14:30:00")
const convertTo24HourFormat = (time) => {
  const [hourMinute, period] = time.split(' ');
  let [hour, minute] = hourMinute.split(':').map(Number);

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
};

// Format date to YYYY-MM-DD format for SQL consistency
const formatDateForSQL = (date) => {
  return date.toISOString().split('T')[0];
};

// Add days to a date and return a new date object
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const db = req.app.get('db');
    
    if (!db) {
      console.error('Database not available in request');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    if (!db.Booking) {
      console.error('Booking model not found');
      return res.status(500).json({ message: 'Database model configuration error' });
    }
    
    const Booking = db.Booking;
    const User = db.User;

    const bookings = await Booking.findAll({
      include: [{ model: User, attributes: ['firstName', 'lastName'] }],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    res.status(200).json(
      bookings.map(booking => ({
        ...booking.toJSON(),
        firstName: booking.User ? booking.User.firstName : null,
        lastName: booking.User ? booking.User.lastName : null
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get bookings by user ID
exports.getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.get('db');
    const Booking = db.Booking;
    const User = db.User;

    // Validate userId
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(400).json({ message: 'Invalid userId: User not found.' });
    }

    const bookings = await Booking.findAll({
      where: { userId },
      include: [{ model: User, attributes: ['firstName', 'lastName'] }],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user.' });
    }

    res.status(200).json(
      bookings.map(booking => ({
        ...booking.toJSON(),
        firstName: booking.User ? booking.User.firstName : null,
        lastName: booking.User ? booking.User.lastName : null
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    console.log('Request body received:', req.body); // Debug log

    const db = req.app.get('db');
    const Booking = db.Booking;
    const User = db.User;

    // Extract data from request body
    const {
      startTime,
      endTime,
      roomId,
      userId,
      firstName,
      lastName,
      department,
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

    // Modified validation - make userId optional
    if (!startTime || !endTime || !roomId) {
      return res.status(400).json({
        message: 'Start time, end time, and roomId are required.',
        missingFields: {
          startTime: !startTime,
          endTime: !endTime,
          roomId: !roomId
        }
      });
    }

    // Validate userId only if provided
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ message: 'Invalid userId: User not found.' });
      }
    }

    // Validate roomId if Room model is available
    if (db.Room) {
      const room = await db.Room.findByPk(roomId);
      if (!room) {
        return res.status(400).json({ message: 'Invalid roomId: Room not found.' });
      }
    }

    // Parse and validate date
    const bookingDate = date ? new Date(date) : null;
    if (!bookingDate || isNaN(bookingDate)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    // Convert times to 24-hour format if needed
    const parsedStartTime = startTime.includes(' ') ? convertTo24HourFormat(startTime) : startTime;
    const parsedEndTime = endTime.includes(' ') ? convertTo24HourFormat(endTime) : endTime;

    // Validate time format (HH:mm:ss)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(parsedStartTime) || !timeRegex.test(parsedEndTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:mm:ss.' });
    }

    // Calculate buffer times for conflict checking
    const startTimeObj = new Date(`1970-01-01T${parsedStartTime}`);
    const endTimeObj = new Date(`1970-01-01T${parsedEndTime}`);

    startTimeObj.setMinutes(startTimeObj.getMinutes() - 30);
    const bufferStartTime = startTimeObj.toTimeString().split(' ')[0].substring(0, 8);

    endTimeObj.setMinutes(endTimeObj.getMinutes() + 30);
    const bufferEndTime = endTimeObj.toTimeString().split(' ')[0].substring(0, 8);

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        date: formatDateForSQL(bookingDate), // Ensure consistent date format for SQL
        status: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('status')),
          'LIKE',
          'confirmed'
        ),
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
      return res.status(409).json({
        message: 'This time slot is unavailable due to the 30-minute buffer rule.'
      });
    }

    // Prepare common booking data
    const bookingData = {
      title,
      userId: userId || null, // Make userId optional
      firstName: firstName || null, 
      lastName: lastName || null, 
      department: department || null, 
      roomId,
      // Add default categoryId if not provided
      categoryId: req.body.categoryId || 1, // Provide a default value (e.g., 1)
      bookingCapacity,
      date: formatDateForSQL(bookingDate),
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      notes,
      isRecurring: isRecurring || false,
      isMealRoom: isMealRoom || false,
      isBreakRoom: isBreakRoom || false,
      recurrenceEndDate: recurrenceEndDate ? formatDateForSQL(new Date(recurrenceEndDate)) : null,
      status: status || 'pending',
      timeSubmitted: literal('GETDATE()'), // You've fixed this already
      remarks,
      changedBy 
    };

    // Handle recurring bookings
    if (isRecurring && recurrenceEndDate) {
      const recurrenceEnd = new Date(recurrenceEndDate);
      if (isNaN(recurrenceEnd)) {
        return res.status(400).json({ message: 'Invalid recurrenceEndDate format.' });
      }
      
      const bookings = [];
      let currentDate = new Date(bookingDate);
      const endDate = new Date(recurrenceEnd);
      
      // Create array of booking dates using proper date handling
      while (currentDate <= endDate) {
        bookings.push({
          ...bookingData,
          date: formatDateForSQL(currentDate) // Use SQL friendly date format
        });
        // Create a new date object each time to avoid reference issues
        currentDate = addDays(currentDate, 1);
      }

      // Bulk create recurring bookings within a transaction
      await db.sequelize.transaction(async (t) => {
        await Booking.bulkCreate(bookings, { transaction: t });
      });

      // Fetch created bookings with User details
      const createdBookings = await Booking.findAll({
        where: {
          roomId,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          date: {
            [Op.between]: [
              formatDateForSQL(bookingDate),
              formatDateForSQL(recurrenceEnd)
            ]
          },
          // Add userId condition only if it exists
          ...(userId ? { userId } : {})
        },
        include: [{ model: User, attributes: ['firstName', 'lastName'] }],
        order: [['date', 'ASC'], ['startTime', 'ASC']]
      });

      return res.status(201).json({
        message: 'Recurring bookings created successfully.',
        bookings: createdBookings.map(booking => ({
          ...booking.toJSON(),
          firstName: booking.User ? booking.User.firstName : booking.firstName,
          lastName: booking.User ? booking.User.lastName : booking.lastName
        }))
      });
    }

    // Save single booking
    const newBooking = await Booking.create(bookingData);

    // Fetch the created booking with User details
    const bookingWithUser = await Booking.findByPk(newBooking.bookingId, {
      include: [{ model: User, attributes: ['firstName', 'lastName'] }]
    });

    console.log('Booking saved:', bookingWithUser); // Debug log

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        ...bookingWithUser.toJSON(),
        firstName: bookingWithUser.User ? bookingWithUser.User.firstName : bookingWithUser.firstName,
        lastName: bookingWithUser.User ? bookingWithUser.User.lastName : bookingWithUser.lastName
      }
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
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
    
    // More specific error handling
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({ 
        message: 'Database error', 
        details: error.message,
        original: error.original?.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create booking', 
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// Get a booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const db = req.app.get('db');
    const Booking = db.Booking;
    const User = db.User;

    const booking = await Booking.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['firstName', 'lastName'] }]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({
      ...booking.toJSON(),
      firstName: booking.User ? booking.User.firstName : booking.firstName,
      lastName: booking.User ? booking.User.lastName : booking.lastName
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a booking
exports.updateBooking = async (req, res) => {
  try {
    const db = req.app.get('db');
    const Booking = db.Booking;
    const User = db.User;

    const { startTime, endTime, roomId, date, userId } = req.body;

    // Validate userId if provided
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ message: 'Invalid userId: User not found.' });
      }
    }

    // Validate roomId if provided
    if (roomId && db.Room) {
      const room = await db.Room.findByPk(roomId);
      if (!room) {
        return res.status(400).json({ message: 'Invalid roomId: Room not found.' });
      }
    }

    // Check for conflicts if time, room, or date is updated
    if (startTime && endTime && roomId && date) {
      const bookingDate = new Date(date);
      if (isNaN(bookingDate)) {
        return res.status(400).json({ message: 'Invalid date format.' });
      }

      // Convert times to 24-hour format if needed
      const parsedStartTime = startTime.includes(' ') ? convertTo24HourFormat(startTime) : startTime;
      const parsedEndTime = endTime.includes(' ') ? convertTo24HourFormat(endTime) : endTime;

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(parsedStartTime) || !timeRegex.test(parsedEndTime)) {
        return res.status(400).json({ message: 'Invalid time format. Use HH:mm:ss.' });
      }

      // Calculate buffer times
      const startTimeObj = new Date(`1970-01-01T${parsedStartTime}`);
      const endTimeObj = new Date(`1970-01-01T${parsedEndTime}`);

      startTimeObj.setMinutes(startTimeObj.getMinutes() - 30);
      const bufferStartTime = startTimeObj.toTimeString().split(' ')[0].substring(0, 8);

      endTimeObj.setMinutes(endTimeObj.getMinutes() + 30);
      const bufferEndTime = endTimeObj.toTimeString().split(' ')[0].substring(0, 8);

      // Check for overlapping confirmed bookings
      const overlappingBooking = await Booking.findOne({
        where: {
          bookingId: { [Op.ne]: req.params.id },
          roomId,
          date: formatDateForSQL(bookingDate), // Ensure consistent date format for SQL
          status: db.sequelize.where(
            db.sequelize.fn('LOWER', db.sequelize.col('status')),
            'LIKE',
            'confirmed'
          ),
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
          message: 'Cannot update booking. This time conflicts with another booking due to the 30-minute buffer rule.'
        });
      }

      // Update time fields in req.body to parsed values
      req.body.startTime = parsedStartTime;
      req.body.endTime = parsedEndTime;
      
      // Convert date to SQL-friendly format
      req.body.date = formatDateForSQL(bookingDate);
    }

    // Find the booking
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update the booking
    await booking.update(req.body);

    // Fetch the updated booking with User details
    const updatedBooking = await Booking.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['firstName', 'lastName'] }]
    });

    res.status(200).json({
      ...updatedBooking.toJSON(),
      firstName: updatedBooking.User ? updatedBooking.User.firstName : updatedBooking.firstName,
      lastName: updatedBooking.User ? updatedBooking.User.lastName : updatedBooking.lastName
    });
  } catch (error) {
    console.error('Update Booking Error:', error);
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
    res.status(400).json({ message: 'Failed to update booking', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check availability
exports.checkAvailability = async (req, res) => {
  try {
    console.log('Received Payload for Availability Check:', req.body); // Debug log

    const db = req.app.get('db');
    const Booking = db.Booking;

    const { startTime, endTime, roomId, date, category } = req.body;

    // Validate required fields
    if (!startTime || !endTime || !roomId || !date || !category) {
      return res.status(400).json({
        message: 'All fields (startTime, endTime, roomId, date, category) are required for availability check.'
      });
    }

    // Validate roomId if Room model is available
    if (db.Room) {
      const room = await db.Room.findByPk(roomId);
      if (!room) {
        return res.status(400).json({ message: 'Invalid roomId: Room not found.' });
      }
    }

    // Parse and validate date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    // Convert times to 24-hour format if needed
    const parsedStartTime = startTime.includes(' ') ? convertTo24HourFormat(startTime) : startTime;
    const parsedEndTime = endTime.includes(' ') ? convertTo24HourFormat(endTime) : endTime;

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(parsedStartTime) || !timeRegex.test(parsedEndTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:mm:ss.' });
    }

    // Calculate buffer times
    const startTimeObj = new Date(`1970-01-01T${parsedStartTime}`);
    const endTimeObj = new Date(`1970-01-01T${parsedEndTime}`);

    startTimeObj.setMinutes(startTimeObj.getMinutes() - 30);
    const bufferStartTime = startTimeObj.toTimeString().split(' ')[0].substring(0, 8);

    endTimeObj.setMinutes(endTimeObj.getMinutes() + 30);
    const bufferEndTime = endTimeObj.toTimeString().split(' ')[0].substring(0, 8);

    // Check for overlapping confirmed bookings
    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        date: formatDateForSQL(bookingDate), // Ensure consistent date format for SQL
        status: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('status')),
          'LIKE',
          'confirmed'
        ),
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
        message: 'This time slot is unavailable due to an already confirmed booking (30-minute buffer rule applies).'
      });
    }

    return res.status(200).json({ available: true, message: 'This time slot is available.' });
  } catch (error) {
    console.error('Check Availability Error:', error);
    res.status(500).json({ message: 'Failed to check availability', error: error.message });
  }
};