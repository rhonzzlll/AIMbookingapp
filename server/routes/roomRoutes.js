const express = require('express');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require('../Controllers/roomController');

const router = express.Router();

// Route to get all rooms
router.get('/', getAllRooms);

// Route to get a single room by ID
router.get('/:id', getRoomById);

// Route to create a new room
router.post('/', createRoom);

// Route to update an existing room
router.put('/:id', updateRoom);

// Route to delete a room
router.delete('/:id', deleteRoom);

module.exports = router;