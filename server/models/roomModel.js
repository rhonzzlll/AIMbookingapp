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
  roomImage: { type: [String] }, 
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
    required: true,
    validate: {
      validator: function (value) {
        const accCategories = [
          "Hybrid Caseroom",
          "Regular Caseroom",
          "Flat Room",
          "Meeting Room",
          "Ministudio",
        ];
        const aimCategories = [
          "Hybrid Caseroom",
          "Flat Room",
          "Open Area",
          "Meeting Room",
        ];

        if (this.building === "ACC Building") {
          return accCategories.includes(value);
        } else if (this.building === "AIM Building") {
          return aimCategories.includes(value);
        }
        return false; // Invalid if building is not recognized
      },
      message: (props) =>
        `${props.value} is not a valid category for the selected building.`,
    },
  },
  roomName: {
    type: String, // Main room or quadrant name
    required: true,
  },
  capacity: {
    type: Number,
    required: function () {
      return !this.isQuadrant; // Required only if it's a standalone room
    },
  },
  roomImage: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    maxlength: 100,
    required: true,
  },
  isQuadrant: {
    type: Boolean,
    default: false,
  },
  subRooms: {
    type: [subRoomSchema],
    default: [],
  },
});

module.exports = mongoose.model('Room', roomSchema);