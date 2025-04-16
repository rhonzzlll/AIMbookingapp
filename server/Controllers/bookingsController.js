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

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { startTime, endTime, room, building } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required.' });
    }

    // Parse the dates
    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time format.' });
    }

    // Save the booking
    const booking = new Booking({
      ...req.body,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
    });

    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

exports.updateBooking = async (req, res) => {
  try {
    // If updating times, we need to check for conflicts again
    const { startTime, endTime, room, building } = req.body;
    
    if (startTime && endTime && room && building) {
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);
      
      if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
        return res.status(400).json({ message: 'Invalid date format for start or end time' });
      }
      
      const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
      const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);
      
      // Check for conflicts, excluding the current booking
      const overlappingBooking = await Booking.findOne({
        _id: { $ne: req.params.id }, // Exclude the current booking
        room: room,
        building: building,
        $or: [
          { startTime: { $lte: bufferStartTime }, endTime: { $gt: bufferStartTime } },
          { startTime: { $lt: bufferEndTime }, endTime: { $gte: bufferEndTime } },
          { startTime: { $gte: bufferStartTime }, endTime: { $lte: bufferEndTime } },
          { startTime: { $lte: bufferStartTime }, endTime: { $gte: bufferEndTime } }
        ],
        status: { $in: ['approved', 'pending'] }
      });
      
      if (overlappingBooking) {
        return res.status(400).json({ 
          message: 'Cannot update booking. This time conflicts with another booking due to the 30-minute buffer rule.'
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

// Additional utility function for the frontend to check availability
exports.checkAvailability = async (req, res) => {
  try {
    const { startTime, endTime, room, building } = req.body;
    
    if (!startTime || !endTime || !room || !building) {
      return res.status(400).json({ message: 'All fields are required for availability check.' });
    }
    
    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);
    
    if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }
    
    const bufferStartTime = new Date(parsedStartTime.getTime() - 30 * 60 * 1000);
    const bufferEndTime = new Date(parsedEndTime.getTime() + 30 * 60 * 1000);
    
    const overlappingBooking = await Booking.findOne({
      room: room,
      building: building,
      $or: [
        { startTime: { $lte: bufferStartTime }, endTime: { $gt: bufferStartTime } },
        { startTime: { $lt: bufferEndTime }, endTime: { $gte: bufferEndTime } },
        { startTime: { $gte: bufferStartTime }, endTime: { $lte: bufferEndTime } },
        { startTime: { $lte: bufferStartTime }, endTime: { $gte: bufferEndTime } }
      ],
      status: { $in: ['approved', 'pending'] }
    });
    
    if (overlappingBooking) {
      return res.status(200).json({ 
        available: false,
        message: 'This time slot is unavailable due to the 30-minute buffer rule.' 
      });
    }
    
    return res.status(200).json({ available: true, message: 'This time slot is available.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};