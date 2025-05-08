const { Booking, Room, User, Sequelize } = require('../models');

// ...rest of your controller code
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
    const bookings = await Booking.findAll({
      include: [
        { model: Room, attributes: ['roomId', 'roomNumber'] },
        { model: User, attributes: ['userId', 'username'] }
      ]
    });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get bookings by User ID
exports.getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.findAll({
      where: { userId },
      order: [['date', 'ASC'], ['startTime', 'ASC']],
      include: [
        { model: Room, attributes: ['roomId', 'roomNumber'] },
        { model: User, attributes: ['userId', 'username'] }
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
    const { startTime, endTime, roomId, userId, title, bookingCapacity, date, notes, isRecurring, recurrenceEndDate, status, timeSubmitted, remarks, changedBy } = req.body;

    if (!startTime || !endTime || !userId || !roomId || !date) {
      return res.status(400).json({
        message: 'Start time, end time, userId, roomId, and date are required.',
      });
    }

    // Validate the time format
    const parsedStartTime = new Date(`${date}T${convertTo24HourFormat(startTime)}`);
    const parsedEndTime = new Date(`${date}T${convertTo24HourFormat(endTime)}`);

    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time format.' });
    }

    // Conflict validation with 30-minute buffer
    const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
    const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        status: 'confirmed',
        [Sequelize.Op.or]: [
          { startTime: { [Sequelize.Op.lte]: bufferStartTime }, endTime: { [Sequelize.Op.gt]: bufferStartTime } },
          { startTime: { [Sequelize.Op.lt]: bufferEndTime }, endTime: { [Sequelize.Op.gte]: bufferEndTime } },
          { startTime: { [Sequelize.Op.gte]: bufferStartTime }, endTime: { [Sequelize.Op.lte]: bufferEndTime } },
          { startTime: { [Sequelize.Op.lte]: bufferStartTime }, endTime: { [Sequelize.Op.gte]: bufferEndTime } },
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
      let currentDate = parsedStartTime;

      while (currentDate <= recurrenceEnd) {
        const currentEndTime = new Date(currentDate.getTime() + (parsedEndTime - parsedStartTime));

        await Booking.create({
          userId,
          roomId,
          title,
          bookingCapacity,
          date: currentDate.toISOString().split('T')[0], // Set correct date
          startTime: currentDate,
          endTime: currentEndTime,
          notes,
          isRecurring,
          recurrenceEndDate,
          status,
          timeSubmitted,
          remarks,
          changedBy
        });

        // Update current date for the next recurrence
        if (recurring === 'Daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (recurring === 'Weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurring === 'Monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      return res.status(201).json({ message: 'Recurring bookings created successfully.' });
    }

    // Save the single booking
    const newBooking = await Booking.create({
      userId,
      roomId,
      title,
      bookingCapacity,
      date,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      notes,
      isRecurring,
      recurrenceEndDate,
      status,
      timeSubmitted,
      remarks,
      changedBy
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking,
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ message: 'Failed to create booking', error: error.message });
  }
};

// Get a booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      where: { bookingId: req.params.id },
      include: [
        { model: Room, attributes: ['roomId', 'roomNumber'] },
        { model: User, attributes: ['userId', 'username'] }
      ]
    });

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
    const { startTime, endTime, roomId, userId, title, bookingCapacity, date, notes, isRecurring, recurrenceEndDate, status, remarks, changedBy } = req.body;

    if (startTime && endTime && roomId && userId && date) {
      const parsedStartTime = new Date(`${date}T${convertTo24HourFormat(startTime)}`);
      const parsedEndTime = new Date(`${date}T${convertTo24HourFormat(endTime)}`);

      if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for start or end time' });
      }

      const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
      const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

      const overlappingBooking = await Booking.findOne({
        where: {
          bookingId: { [Sequelize.Op.ne]: req.params.id },
          roomId,
          status: 'confirmed',
          [Sequelize.Op.or]: [
            { startTime: { [Sequelize.Op.lte]: bufferStartTime }, endTime: { [Sequelize.Op.gt]: bufferStartTime } },
            { startTime: { [Sequelize.Op.lt]: bufferEndTime }, endTime: { [Sequelize.Op.gte]: bufferEndTime } },
            { startTime: { [Sequelize.Op.gte]: bufferStartTime }, endTime: { [Sequelize.Op.lte]: bufferEndTime } },
            { startTime: { [Sequelize.Op.lte]: bufferStartTime }, endTime: { [Sequelize.Op.gte]: bufferEndTime } },
          ]
        }
      });

      if (overlappingBooking) {
        return res.status(400).json({
          message: 'Cannot update booking. This time conflicts with another booking due to the 30-minute buffer rule.',
        });
      }
    }

    const updatedBooking = await Booking.update(
      {
        userId,
        roomId,
        title,
        bookingCapacity,
        date,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        notes,
        isRecurring,
        recurrenceEndDate,
        status,
        remarks,
        changedBy
      },
      { where: { bookingId: req.params.id }, returning: true }
    );

    if (!updatedBooking[0]) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json(updatedBooking[1][0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.destroy({ where: { bookingId: req.params.id } });

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
    const { startTime, endTime, roomId, building, category } = req.body;

    if (!startTime || !endTime || !roomId || !building || !category) {
      return res.status(400).json({ message: 'All fields (startTime, endTime, roomId, building, category) are required for availability check.' });
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
    const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);

    const overlappingBooking = await Booking.findOne({
      where: {
        roomId,
        building,
        category,
        status: 'confirmed',
        [Sequelize.Op.or]: [
          { startTime: { [Sequelize.Op.lte]: bufferStartTime }, endTime: { [Sequelize.Op.gt]: bufferStartTime } },
          { startTime: { [Sequelize.Op.lt]: bufferEndTime }, endTime: { [Sequelize.Op.gte]: bufferEndTime } },
          { startTime: { [Sequelize.Op.gte]: bufferStartTime }, endTime: { [Sequelize.Op.lte]: bufferEndTime } },
          { startTime: { [Sequelize.Op.lte]: bufferStartTime }, endTime: { [Sequelize.Op.gte]: bufferEndTime } },
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



 
exports.checkAvailability = async (req, res) => {
  try {
    console.log('Received Payload for Availability Check:', req.body); // Debugging log

    const { startTime, endTime, room, building, category, status } = req.body;

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

    // FIXED: Use case-insensitive regex for status to handle both "confirmed" and "Confirmed"
    const statusQuery = { $regex: new RegExp('^confirmed$', 'i') };

    const overlappingBooking = await Booking.findOne({
      room,
      building,
      category,
      $or: [
        { startTime: { $lte: bufferStartTime }, endTime: { $gt: bufferStartTime } },
        { startTime: { $lt: bufferEndTime }, endTime: { $gte: bufferEndTime } },
        { startTime: { $gte: bufferStartTime }, endTime: { $lte: bufferEndTime } },
        { startTime: { $lte: bufferStartTime }, endTime: { $gte: bufferEndTime } },
      ],
      status: statusQuery  // Use the regex pattern for case-insensitive matching
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