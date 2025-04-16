const mongoose = require('mongoose'); // Import mongoose

const bookingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  room: {
    type: String,
    required: true,
    trim: true
  },
  building: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  recurring: {
    type: String,
    enum: ['No', 'Daily', 'Weekly', 'Monthly'],
    default: 'No'
  },
  recurrenceEndDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'declined'],
    default: 'pending'
  },
  userId: { // Add userId field
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference the User model
    required: true
  }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema); // Define the Booking model

module.exports = Booking; // Export the Booking model