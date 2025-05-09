const db = require('../models');
const Subroom = db.Subroom;
const Room = db.Room;

// Create a new subroom
const createSubroom = async (req, res) => {
  try {
    console.log("Creating subroom with data:", req.body);
    const { roomId, name, capacity, description, image } = req.body;

    // Support legacy field names
    const subroomName = name || req.body.subroomName;
    const subroomCapacity = capacity || req.body.subroomCapacity;

    // Validate input
    if (!roomId || !subroomName || !subroomCapacity) {
      return res.status(400).json({ 
        message: 'roomId, name, and capacity are required' 
      });
    }

    // Check if the associated room exists
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Associated room not found' });
    }

    // Create and save the subroom with field names matching the database
    const newSubroom = await Subroom.create({ 
      roomId, 
      name: subroomName,
      capacity: subroomCapacity,
      description: description || null,
      image: image || null
    });
    
    console.log(`Subroom created with ID: ${newSubroom.subRoomId}`);
    res.status(201).json(newSubroom);
  } catch (error) {
    console.error('Error creating subroom:', error);
    res.status(500).json({ 
      message: 'Error creating subroom', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Get all subrooms
const getAllSubrooms = async (req, res) => {
  try {
    console.log("Fetching all subrooms");
    const subrooms = await Subroom.findAll({
      include: [{ 
        model: Room, 
        as: 'room' 
      }],
      logging: sql => console.log("Generated SQL:", sql)
    });
    
    console.log(`Found ${subrooms.length} subrooms`);
    res.status(200).json(subrooms);
  } catch (error) {
    console.error('Error fetching subrooms:', error);
    res.status(500).json({ 
      message: 'Error fetching subrooms', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Get a single subroom by ID
const getSubroomById = async (req, res) => {
  try {
    console.log(`Fetching subroom with ID: ${req.params.id}`);
    
    const subroom = await Subroom.findByPk(req.params.id, {
      include: [{ model: Room, as: 'room' }]
    });
    
    if (!subroom) {
      console.log(`Subroom with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Subroom not found' });
    }
    
    res.status(200).json(subroom);
  } catch (error) {
    console.error(`Error fetching subroom ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error fetching subroom', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Get subrooms by room ID
const getSubroomsByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`Fetching subrooms for room ID: ${roomId}`);
    
    // First check if the room exists
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const subrooms = await Subroom.findAll({
      where: { roomId },
      logging: sql => console.log("Generated SQL:", sql)
    });
    
    console.log(`Found ${subrooms.length} subrooms for room ${roomId}`);
    res.status(200).json(subrooms);
  } catch (error) {
    console.error(`Error fetching subrooms for room ${req.params.roomId}:`, error);
    res.status(500).json({ 
      message: 'Error fetching subrooms', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Update a subroom
const updateSubroom = async (req, res) => {
  try {
    console.log(`Updating subroom with ID: ${req.params.id}`, req.body);
    const { name, capacity, description, image } = req.body;

    // Support legacy field names
    const subroomName = name || req.body.subroomName;
    const subroomCapacity = capacity || req.body.subroomCapacity;

    // Validate input for required fields
    if (!subroomName || !subroomCapacity) {
      return res.status(400).json({ 
        message: 'name and capacity are required' 
      });
    }

    // Find the subroom to update
    const subroom = await Subroom.findByPk(req.params.id);
    if (!subroom) {
      console.log(`Subroom with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Subroom not found' });
    }

    // Update the subroom with field names matching the database
    await subroom.update({ 
      name: subroomName,
      capacity: subroomCapacity,
      description: description !== undefined ? description : subroom.description,
      image: image !== undefined ? image : subroom.image
    });
    
    console.log(`Subroom ${req.params.id} updated successfully`);
    
    // Return the updated subroom
    const updatedSubroom = await Subroom.findByPk(req.params.id, {
      include: [{ model: Room, as: 'room' }]
    });
    
    res.status(200).json(updatedSubroom);
  } catch (error) {
    console.error(`Error updating subroom ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error updating subroom', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Delete a subroom
const deleteSubroom = async (req, res) => {
  try {
    console.log(`Deleting subroom with ID: ${req.params.id}`);
    
    const subroom = await Subroom.findByPk(req.params.id);
    if (!subroom) {
      console.log(`Subroom with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Subroom not found' });
    }

    await subroom.destroy();
    console.log(`Subroom ${req.params.id} deleted successfully`);
    
    res.status(200).json({ 
      message: 'Subroom deleted successfully',
      deletedSubroomId: req.params.id
    });
  } catch (error) {
    console.error(`Error deleting subroom ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error deleting subroom', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Debug endpoint to show subroom model structure
const debugSubroomModel = async (req, res) => {
  try {
    console.log("Debugging subroom model");
    
    // Get model attributes
    const attributes = Object.keys(Subroom.rawAttributes);
    
    // Get table information from database
    const [columns] = await db.sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'subroom'
    `);
    
    // Attempt to get a sample record
    const sampleSubroom = await Subroom.findOne();
    
    res.status(200).json({
      modelName: Subroom.name,
      tableName: Subroom.tableName,
      schema: Subroom.options.schema,
      modelAttributes: attributes,
      databaseColumns: columns,
      sampleRecord: sampleSubroom ? sampleSubroom.toJSON() : null
    });
  } catch (error) {
    console.error("Error debugging subroom model:", error);
    res.status(500).json({
      message: "Error debugging subroom model",
      error: error.message,
      stack: error.stack
    });
  }
};

module.exports = {
  createSubroom,
  getAllSubrooms,
  getSubroomById,
  getSubroomsByRoomId,
  updateSubroom,
  deleteSubroom,
  debugSubroomModel // Added for debugging
};