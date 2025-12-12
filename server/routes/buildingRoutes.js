const express = require('express');
const router = express.Router();
const controller = require('../Controllers/buildingController'); // Match the actual folder casing

router.post('/', controller.createBuilding);
router.get('/', controller.getAllBuildings);
router.get('/:id', controller.getBuildingById);
router.put('/:id', controller.updateBuilding);
router.delete('/:id', controller.deleteBuilding);

module.exports = router;