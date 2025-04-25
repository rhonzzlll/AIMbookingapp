const mongoose = require('mongoose');

const subRoomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
  },
  capacity: {    
    type: Number,
    required: true,
  },
  roomImage: { 
    type: [String] 
  }, 
  description: {
    type: String,
    maxlength: 100,
    required: true,
  },
});

const roomSchema = new mongoose.Schema({
  building: {
    type: String,
    enum: ["ACC Building", "AIM Building"],
    required: true,
  },
  category: {
    type: String,
    required: true, // Removed the validate property
  },
  roomName: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: function () {
      return !this.isQuadrant;
    },
  },
  isQuadrant: {
    type: Boolean,
    default: false,
  },
  subRooms: {
    type: [subRoomSchema],
    default: [],
  },
  description: {
    type: String,
    maxlength: 100,
    required: true,
  },
  roomImage: { 
    type: [String] 
  },
});

module.exports = mongoose.model('Room', roomSchema); 