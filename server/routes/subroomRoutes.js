const express = require('express');
const router = express.Router();
const subroomController = require('../Controllers/subRoomController');

// Subroom CRUD operations
router.post('/', subroomController.createSubroom);
router.get('/', subroomController.getAllSubrooms);
router.get('/:id', subroomController.getSubroomById);
router.put('/:id', subroomController.updateSubroom);
router.delete('/:id', subroomController.deleteSubroom);

// Get subrooms by room ID (special operation)
router.get('/by-room/:roomId', subroomController.getSubroomsByRoomId);

module.exports = router;