const express = require('express');
const router = express.Router();
const subroomController = require('../Controllers/subroomController');

// Define routes for subroom operations
router.post('/', subroomController.createSubroom);
router.get('/', subroomController.getAllSubrooms);
router.get('/:id', subroomController.getSubroomById);
router.put('/:id', subroomController.updateSubroom);
router.delete('/:id', subroomController.deleteSubroom);

module.exports = router;
