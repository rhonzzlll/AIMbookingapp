const express = require('express');
const router = express.Router();
const roomController = require('../Controllers/roomController');

/**
 * Room Routes
 * 
 * For create and update routes, we don't need to specify multer middleware here
 * since it's already integrated with the controller methods through the 
 * processRoomCreate and processRoomUpdate wrappers.
 */

// Get all rooms (with optional filtering)
router.get('/', roomController.getAllRooms);

// Get a specific room by ID
router.get('/:id', roomController.getRoomById);

// Create a new room (multer is handled in the controller)
router.post('/', roomController.createRoom);

// Update a room (multer is handled in the controller)
router.put('/:id', roomController.updateRoom);

// Delete a room and its subrooms
router.delete('/:id', roomController.deleteRoom);

// Debug endpoint to check room structure (useful for development)
router.get('/debug/structure', roomController.debugRoomStructure);

module.exports = router;