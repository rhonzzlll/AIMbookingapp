const { Building, Room, Category } = require('../models/');

// Create a new Building
exports.createBuilding = async (req, res) => {
  try {
    const { 
      buildingId, 
      buildingName, 
      buildingDescription, 
      buildingImage,
      createdAt,
      updatedAt
    } = req.body;

    // Basic validation
    if (!buildingId || !buildingName) {
      return res.status(400).json({ message: 'Building ID and name are required' });
    }

    // Create a new building record with all fields
    const newBuilding = await Building.create({
      buildingId,
      buildingName,
      buildingDescription,
      buildingImage,
      createdAt: createdAt || new Date(),
      updatedAt: updatedAt || new Date()
    });

    // Return the newly created building
    res.status(201).json(newBuilding);
  } catch (err) {
    console.error('Create Building Error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Building ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

// Retrieve all Buildings
exports.getAllBuildings = async (req, res) => {
  try {
    const buildings = await Building.findAll();
    res.json(buildings);
  } catch (err) {
    console.error('Get All Buildings Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Retrieve a single Building by ID
exports.getBuildingById = async (req, res) => {
  try {
    const building = await Building.findByPk(req.params.id);

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.json(building);
  } catch (err) {
    console.error('Get Building By ID Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update an existing Building
exports.updateBuilding = async (req, res) => {
  try {
    const { 
      buildingName, 
      buildingDescription, 
      buildingImage,
      updatedAt 
    } = req.body;

    // Find the building first to ensure it exists
    const building = await Building.findByPk(req.params.id);
    
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Update the building with new values
    await building.update({
      buildingName: buildingName || building.buildingName,
      buildingDescription,
      buildingImage,
      updatedAt: updatedAt || new Date()
    });

    // Fetch the updated building to return
    const updatedBuilding = await Building.findByPk(req.params.id);
    res.json(updatedBuilding);
  } catch (err) {
    console.error('Update Building Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a Building
exports.deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findByPk(req.params.id);
    
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check for associated Rooms
    const associatedRooms = await Room.findOne({
      where: { buildingId: req.params.id }
    });

    if (associatedRooms) {
      return res.status(409).json({
        message: 'Cannot delete building with associated rooms. Remove rooms first.'
      });
    }

    // Check for associated Categories
    const associatedCategories = await Category.findOne({
      where: { buildingId: req.params.id }
    });

    if (associatedCategories) {
      return res.status(409).json({
        message: 'Cannot delete building with associated categories. Remove categories first.'
      });
    }

    // Delete the building
    await building.destroy();
    res.json({ message: 'Building deleted successfully' });
  } catch (err) {
    console.error('Delete Building Error:', err);
    res.status(500).json({ error: err.message });
  }
};