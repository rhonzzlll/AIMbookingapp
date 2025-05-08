const express = require('express');
const router = express.Router();
// Fix the path to match your actual file location and name
const controller = require('../Controllers/categoryController'); // Capitalized C, singular Controller

router.post('/', controller.createCategory);
router.get('/', controller.getAllCategories);
router.get('/:id', controller.getCategoryById);
router.put('/:id', controller.updateCategory);
router.delete('/:id', controller.deleteCategory);

module.exports = router;