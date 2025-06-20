const { Op } = require('sequelize');
const db = require('../models');
const Booking = db.Booking;
const { v4: uuidv4 } = require('uuid');  
const { transporter, sendMailWithRetry } = require('../mailer');
const User = db.User;  
const Room = db.Room;
const Building = db.Building;

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

 
function formatTimeToHHMM(timeVal) {
  if (!timeVal) return '';
  if (typeof timeVal === 'string') {
  
    return timeVal.slice(0, 5);
  }
  if (timeVal instanceof Date) {
     
    const hours = timeVal.getUTCHours().toString().padStart(2, '0');
    const minutes = timeVal.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return '';
}
  
 
function formatDate(dateVal) {
  if (!dateVal) return '';

  let date;
  if (dateVal instanceof Date) {
    date = dateVal;
  } else if (typeof dateVal === 'string') {
    date = new Date(dateVal);
  } else {
    return '';
  }

   
  if (isNaN(date.getTime())) {
    return '';
  }

 
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return `${months[month]} ${day}, ${year}`;
}

 
async function sendBookingEmail(booking, status, declineReason = null) {
  try {
    const user = await User.findByPk(booking.userId);
    if (!user || !user.email) {
      console.log('User not found or no email address');
      return;
    }

    const room = await Room.findByPk(booking.roomId);
    const building = await Building.findByPk(booking.buildingId);
    const roomDisplay = room ? room.roomName : booking.roomId;
    const buildingDisplay = building ? building.buildingName : booking.buildingId;

    const bookingDate = formatDate(booking.date);
    const startTime = formatTimeToHHMM(booking.startTime);
    const endTime = formatTimeToHHMM(booking.endTime);
    const userName = user.firstName || user.name || 'User';

    let subject, message;

    switch (status) {
      case 'confirmed':
        subject = `[Booking ID: ${booking.bookingId}] Your Reservation is Confirmed`;
        message = `Dear ${userName},

We’re pleased to inform you that your reservation has been APPROVED.

Should you have any special requests or require further assistance, please don’t hesitate to reach out.

Booking Details:
Date: ${bookingDate}
 Time: ${startTime} - ${endTime}
 Room: ${roomDisplay}
 Building: ${buildingDisplay}

Sincerely,

ACC Reservations`;
        break;

      case 'declined':
        subject = `[Booking ID: ${booking.bookingId}] Reservation Request Unsuccessful`;
        message = `Dear ${userName},

Thank you for your reservation request. Unfortunately, we are unable to accommodate your booking at this time due to unavailability or a scheduling conflict.

We encourage you to check the booking calendar for alternative date and/or time.
 Time: ${startTime} - ${endTime}
 Room: ${roomDisplay}
 Building: ${buildingDisplay}
${declineReason ? `\n Reason: ${declineReason}` : ''}

Sincerely,

ACC Reservations`;
        break;

      case 'cancelled':
        subject = `[Booking ID: ${booking.bookingId}] Booking Cancelled - Notification`;
        message = `Hello ${userName},

Your booking has been successfully cancelled.

Cancelled Booking Details:
 Date: ${bookingDate}
 Time: ${startTime} - ${endTime}
 Room: ${roomDisplay}
 Building: ${buildingDisplay} 

If you cancelled this booking by mistake or need to make a new reservation, please feel free to submit a new booking request.

Thank you for using our booking system!

Best regards,
Booking Management Team`;
        break;

      case 'pending':
        subject = `[Booking ID: ${booking.bookingId}] Your Reservation Request is Currently Pending`;
        message = `Dear ${userName},

Thank you for submitting your reservation request. Your reservation is currently PENDING.

Our team is reviewing the details and will notify you once a decision is made.
Should you have any questions or updates, please don’t hesitate to reach out.

Booking Details:
Date: ${bookingDate}
Time: ${startTime} - ${endTime}
Room: ${roomDisplay}
Building: ${buildingDisplay}

Sincerely,

ACC Reservations`;
        break;

      default:
        console.log('Unknown booking status for email:', status);
        return;
    }

    await sendMailWithRetry({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: subject,
      text: message
    });

    console.log(`Email sent successfully to ${user.email} for booking ${booking.bookingId} - Status: ${status}`);
  } catch (error) {
    console.error('Email send error:', error);
  }
}

// Helper to send pending booking notification to all admins
async function sendPendingBookingToAdmins(booking) {
  try {
    // Find all admins
    const admins = await User.findAll({
      where: db.Sequelize.where(
        db.Sequelize.fn('LOWER', db.Sequelize.col('role')),
        'admin'
      )
    });
    if (!admins || admins.length === 0) {
      console.log('No admin users found');
      return;
    }

    // Find the user who made the booking
    const user = await User.findByPk(booking.userId);
    const userName = user ? (user.firstName || user.name || `User ID: ${booking.userId}`) : `User ID: ${booking.userId}`;

    // Fetch room and building names
    const room = await Room.findByPk(booking.roomId);
    const building = await Building.findByPk(booking.buildingId);
    const roomDisplay = room ? room.roomName : booking.roomId;
    const buildingDisplay = building ? building.buildingName : booking.buildingId;

    const bookingDate = formatDate(booking.date);
    const startTime = formatTimeToHHMM(booking.startTime);
    const endTime = formatTimeToHHMM(booking.endTime);

    let subject = `[Booking ID: ${booking.bookingId}] Your Reservation Request is Currently Pending`;
    let message = `Dear ${userName},

Thank you for submitting your reservation request. Your reservation is currently PENDING.

Our team is reviewing the details and will notify you once a decision is made.
Should you have any questions or updates, please don’t hesitate to reach out.


Booking Details:
Date: ${bookingDate}
Time: ${startTime} - ${endTime}
Room: ${roomDisplay}
Building: ${buildingDisplay}
Requested by: ${userName} (${user && user.email ? user.email : ''})

 
Sincerely,

ACC Reservations`;

    // Send to all admins
    for (const admin of admins) {
      if (admin.email) {
        await sendMailWithRetry({
          from: process.env.SMTP_USER,
          to: admin.email,
          subject: subject,
          text: message
        });
      }
    }
    console.log(`Pending booking email sent to all admins for booking ${booking.bookingId}`);
  } catch (error) {
    console.error('Admin pending booking email error:', error);
  }
}

// Helper to send cancelled booking notification to all admins
async function sendCancelledBookingToAdmins(booking) {
  try {
    const admins = await User.findAll({
      where: db.Sequelize.where(
        db.Sequelize.fn('LOWER', db.Sequelize.col('role')),
        'admin'
      )
    });
    if (!admins || admins.length === 0) {
      console.log('No admin users found');
      return;
    }
    const user = await User.findByPk(booking.userId);
    const userName = user ? (user.firstName || user.name || `User ID: ${booking.userId}`) : `User ID: ${booking.userId}`;
    const room = await Room.findByPk(booking.roomId);
    const building = await Building.findByPk(booking.buildingId);
    const roomDisplay = room ? room.roomName : booking.roomId;
    const buildingDisplay = building ? building.buildingName : booking.buildingId;
    const bookingDate = formatDate(booking.date);
    const startTime = formatTimeToHHMM(booking.startTime);
    const endTime = formatTimeToHHMM(booking.endTime);

    let subject = `[Booking ID: ${booking.bookingId}] Booking Cancelled - Notification`;
    let message = `Hello Admin,

A booking has been cancelled.

Cancelled Booking Details:
 Date: ${bookingDate}
 Time: ${startTime} - ${endTime}
 Room: ${roomDisplay}
 Building: ${buildingDisplay}
 Cancelled by: ${userName} (${user && user.email ? user.email : ''})

Please update your records if necessary.

Best regards,
Booking Management System`;

    for (const admin of admins) {
      if (admin.email) {
        await sendMailWithRetry({
  from: process.env.SMTP_USER,
  to: admin.email,
  subject: subject,
  text: message
});
      }
    }
    console.log(`Cancelled booking email sent to all admins for booking ${booking.bookingId}`);
  } catch (error) {
    console.error('Admin cancelled booking email error:', error);
  }
}

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
    console.log("Bookings response:", bookings); // Log the response
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: err.message });
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

    // Check for duplicate pending booking for the same user, room, date, and time
    const duplicatePending = await Booking.findOne({
      where: {
        userId,
        roomId,
        buildingId,
        date: parsedDate,
        startTime,
        endTime,
        status: 'pending'
      }
    });
    if (duplicatePending) {
      return res.status(400).json({
        message: 'You already have a pending booking for this room, date, and time.'
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

      // Send email notification based on status
      if (booking.status && ['confirmed', 'declined', 'cancelled'].includes(booking.status)) {
        setImmediate(() => {
          sendBookingEmail(booking, booking.status, booking.declineReason);
        });
      }
      // Send pending notification to all admins
      if (booking.status === 'pending') {
        setImmediate(() => {
          sendBookingEmail(booking, 'pending'); // Send pending email to the user
          sendPendingBookingToAdmins(booking); // Notify admins
        });
      }

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

    // Send email notification based on status
    if (newBooking.status && ['confirmed', 'declined', 'cancelled'].includes(newBooking.status)) {
      // Send email in background without blocking response
      setImmediate(() => {
        sendBookingEmail(newBooking, newBooking.status, newBooking.declineReason);
      });
    }

    // Send pending booking notification to admins
    if (newBooking.status === 'pending') {
      setImmediate(() => {
        sendPendingBookingNotifications(newBooking); // Notify admins and user
      });
    }

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

      // Only check for confirmed status bookings
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

    // Store the original status to check if it changed
    const originalStatus = booking.status;

    // Prepare update data
    const updateData = { ...req.body };

    // If status is declined, set declineReason; otherwise, clear it
    if (status === 'declined') {
      updateData.declineReason = declineReason || '';
    } else if (status && status !== 'declined') {
      updateData.declineReason = null;
    }

    // Update the booking
    await booking.update(updateData);

    // Get the updated booking
    const updatedBooking = await Booking.findByPk(req.params.id);

    // Send email notification if status changed and is one of the relevant statuses
    if (status && status !== originalStatus && ['confirmed', 'declined', 'cancelled'].includes(status)) {
      // Send email in background without blocking response
      setImmediate(() => {
        sendBookingEmail(updatedBooking, status, status === 'declined' ? declineReason : null);
      });
    }

    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error('Update Booking Error:', error);
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
    const { cancelReason } = req.body; // <-- Accept cancelReason from request
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow cancelling if status is pending or confirmed
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only pending or confirmed bookings can be cancelled.' });
    }

    const originalStatus = booking.status;
    booking.status = 'cancelled';
    booking.cancelReason = cancelReason ?? null; // <-- Set to null if undefined
    await booking.save();

    // Send cancellation email if status changed
    if (originalStatus !== 'cancelled') {
      setImmediate(() => {
        sendBookingEmail(booking, 'cancelled');
        sendCancelledBookingToAdmins(booking);
      });
    }

    res.status(200).json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
};
// Helper to send pending booking notification to all admins and the user
async function sendPendingBookingNotifications(booking) {
  try {
    // Find all admins
    const admins = await User.findAll({
      where: db.Sequelize.where(
        db.Sequelize.fn('LOWER', db.Sequelize.col('role')),
        'admin'
      )
    });

    if (!admins || admins.length === 0) {
      console.log('No admin users found');
    }

    // Find the user who made the booking
    const user = await User.findByPk(booking.userId);
    if (!user || !user.email) {
      console.log('User not found or no email address');
      return;
    }

    const userName = user.firstName || user.name || `User ID: ${booking.userId}`;
    const room = await Room.findByPk(booking.roomId);
    const building = await Building.findByPk(booking.buildingId);
    const roomDisplay = room ? room.roomName : booking.roomId;
    const buildingDisplay = building ? building.buildingName : booking.buildingId;

    const bookingDate = formatDate(booking.date);
    const startTime = formatTimeToHHMM(booking.startTime);
    const endTime = formatTimeToHHMM(booking.endTime);

    // Email to Admins
    const adminSubject = `[Booking ID: ${booking.bookingId}] New Pending Booking Request`;
    const adminMessage = `Hello Admin,

A new booking request is pending approval.

Booking Details:
 Date: ${bookingDate}
Time: ${startTime} - ${endTime}
 Room: ${roomDisplay}
 Building: ${buildingDisplay}
 Requested by: ${userName} (${user.email})

Please review and take action in the booking system.`;

    // Get admin emails
    const adminEmails = admins
      .filter(admin => admin.email)
      .map(admin => admin.email);
    
    if (adminEmails.length > 0) {
      try {
        // Send a single email to all admins using BCC
        await sendMailWithRetry({
          from: process.env.SMTP_USER,
          bcc: adminEmails,
          subject: adminSubject,
          text: adminMessage
        });
        console.log(`Pending booking email sent to ${adminEmails.length} admins`);
      } catch (adminEmailError) {
        console.error('Failed to send email to admins:', adminEmailError);
      }
    }

    // Brief delay before sending user email
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Email to the User
    const userSubject = `[Booking ID: ${booking.bookingId}] Your Reservation Request is Currently Pending`;
    const userMessage = `Dear ${userName},

Thank you for submitting your reservation request. Your reservation is currently PENDING.

Our team is reviewing the details and will notify you once a decision is made.
Should you have any questions or updates, please don’t hesitate to reach out.

Booking Details:
Date: ${bookingDate}
Time: ${startTime} - ${endTime}
Room: ${roomDisplay}
Building: ${buildingDisplay}
Requested by: ${userName} (${user.email})

Sincerely,

ACC Reservations`;

    try {
      await sendMailWithRetry({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: userSubject,
        text: userMessage
      });
      console.log(`Pending booking email sent to user ${user.email}`);
    } catch (userEmailError) {
      console.error(`Failed to send email to user ${user.email}:`, userEmailError);
    }
    
  } catch (error) {
    console.error('Error sending pending booking notifications:', error);
  }
}