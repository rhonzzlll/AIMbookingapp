const { Subroom, Room } = require('../models'); // Import models

// Create a new subroom
const createSubroom = async (req, res) => {
  try {
    const { roomId, capacity } = req.body;

    // Validate input
    if (!roomId || !capacity) {
      return res.status(400).json({ message: 'roomId and capacity are required' });
    }

    // Check if the associated room exists
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Associated room not found' });
    }

    // Create and save the subroom
    const newSubroom = await Subroom.create({ roomId, capacity });
    res.status(201).json(newSubroom);
  } catch (error) {
    console.error('Error creating subroom:', error);
    res.status(500).json({ message: 'Error creating subroom', error: error.message });
  }
};

// Get all subrooms
const getAllSubrooms = async (req, res) => {
  try {
    const subrooms = await Subroom.findAll();
    res.status(200).json(subrooms);
  } catch (error) {
    console.error('Error fetching subrooms:', error);
    res.status(500).json({ message: 'Error fetching subrooms', error: error.message });
  }
};

// Get a single subroom by ID
const getSubroomById = async (req, res) => {
  try {
    const subroom = await Subroom.findByPk(req.params.id);
    if (!subroom) {
      return res.status(404).json({ message: 'Subroom not found' });
    }
    res.status(200).json(subroom);
  } catch (error) {
    console.error('Error fetching subroom:', error);
    res.status(500).json({ message: 'Error fetching subroom', error: error.message });
  }
};

// Update a subroom
const updateSubroom = async (req, res) => {
  try {
    const { roomId, capacity } = req.body;

    // Validate input
    if (!roomId || !capacity) {
      return res.status(400).json({ message: 'roomId and capacity are required' });
    }

    // Check if the associated room exists
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Associated room not found' });
    }

    // Find and update the subroom
    const subroom = await Subroom.findByPk(req.params.id);
    if (!subroom) {
      return res.status(404).json({ message: 'Subroom not found' });
    }

    await subroom.update({ roomId, capacity });
    res.status(200).json(subroom);
  } catch (error) {
    console.error('Error updating subroom:', error);
    res.status(500).json({ message: 'Error updating subroom', error: error.message });
  }
};

// Delete a subroom
const deleteSubroom = async (req, res) => {
  try {
    const subroom = await Subroom.findByPk(req.params.id);
    if (!subroom) {
      return res.status(404).json({ message: 'Subroom not found' });
    }

    await subroom.destroy();
    res.status(200).json({ message: 'Subroom deleted successfully' });
  } catch (error) {
    console.error('Error deleting subroom:', error);
    res.status(500).json({ message: 'Error deleting subroom', error: error.message });
  }
};

module.exports = {
  createSubroom,
  getAllSubrooms,
  getSubroomById,
  updateSubroom,
  deleteSubroom,
};
