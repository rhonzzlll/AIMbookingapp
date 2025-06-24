const express = require('express');
const router = express.Router();
const roomController = require('../Controllers/roomController');

// Get all rooms (with optional filtering)
router.get('/', roomController.getAllRooms);

// Get a specific room by ID
router.get('/:id', roomController.getRoomById);

// Create a new room (add multer middleware here)
router.post(
  '/',
  roomController.uploadRoomAndSubroomImages,
  roomController.createRoom
);

// Update a room (add multer middleware here)
router.put(
  '/:id',
  roomController.uploadRoomAndSubroomImages,
  roomController.updateRoom
);

// Delete a room and its subrooms
router.delete('/:id', roomController.deleteRoom);

// Debug endpoint to check room structure (useful for development)
router.get('/debug/structure', roomController.debugRoomStructure);

module.exports = router;