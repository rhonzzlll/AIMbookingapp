const express = require('express');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require('../Controllers/roomController');
const Room = require('../models/roomModel'); // Adjust the path as needed

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

router.post('/rooms', async (req, res) => {
  try {
    const { building } = req.body;
    const room = new Room({ building });
    const savedRoom = await room.save();
    res.status(201).json(savedfRoom);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;