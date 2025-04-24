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
        return false;
      },
      message: (props) =>
        `${props.value} is not a valid category for the selected building.`,
    },
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
