const mongoose = require('mongoose'); // Import mongoose

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String, // Changed to String
    required: true,
    trim: true,
  },
  room: {
    type: String, // Changed to String
    required: true,
    trim: true,
  },
  building: {
    type: String, // Changed to String
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  recurring: {
    type: String,
    enum: ['No', 'Daily', 'Weekly', 'Monthly'],
    default: 'No',
  },
  recurrenceEndDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'declined'],
    default: 'pending',
  },
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;