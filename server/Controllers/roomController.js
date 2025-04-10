const Room = require('../models/roomModel');
const crypto = require('crypto'); // For generating a shortened image name
 
const processImage = (image) => {
  if (!image) return null;

   
  const shortenedName = crypto.randomBytes(8).toString('hex');

 
  const base64Image = Buffer.from(image).toString('base64');

  return {
    shortenedName,
    base64Image,
  };
};

// Validate subrooms
const validateSubRooms = (subRooms) => {
  if (!Array.isArray(subRooms)) {
    throw new Error('Subrooms must be an array');
  }

  subRooms.forEach((subRoom, index) => {
    if (!subRoom.roomName || typeof subRoom.roomName !== 'string') {
      throw new Error(`Subroom at index ${index} must have a valid roomName`);
    }
    if (!subRoom.capacity || typeof subRoom.capacity !== 'number' || subRoom.capacity <= 0) {
      throw new Error(`Subroom at index ${index} must have a valid capacity`);
    }
    if (!subRoom.description || typeof subRoom.description !== 'string') {
      throw new Error(`Subroom at index ${index} must have a valid description`);
    }
  });
};

// Get all rooms
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms', error });
  }
};

// Get a single room by ID
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room', error });
  }
};

// Create a new room
const createRoom = async (req, res) => {
  try {
    const { roomImage, subRooms = [], isQuadrant, ...roomData } = req.body;

    // Log the payload for debugging
    console.log('Payload received:', req.body);

    // Validate required fields
    if (!roomData.roomName || !roomData.building || !roomData.category || !roomData.capacity || !roomData.description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate subrooms if isQuadrant is true
    if (isQuadrant) {
      validateSubRooms(subRooms);
    }

    // Process the image
    const processedImage = processImage(roomImage);

    const newRoom = new Room({
      ...roomData,
      isQuadrant: !!isQuadrant, // Ensure isQuadrant is a boolean
      subRooms: isQuadrant ? subRooms : [], // Only include subRooms if isQuadrant is true
      roomImage: processedImage ? processedImage.base64Image : null,
    });

    const savedRoom = await newRoom.save();
    res.status(201).json(savedRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(400).json({ message: 'Error creating room', error: error.message });
  }
};

// Update an existing room
const updateRoom = async (req, res) => {
  try {
    const { roomImage, subRooms, isQuadrant, ...roomData } = req.body;

    // Validate subrooms if isQuadrant is true
    if (isQuadrant) {
      validateSubRooms(subRooms);
    }

    // Process the image if provided
    let updatedData = { ...roomData, isQuadrant };
    if (roomImage) {
      const processedImage = processImage(roomImage);
      updatedData.roomImage = processedImage ? processedImage.base64Image : null;
    }

    // Only include subRooms if isQuadrant is true
    updatedData.subRooms = isQuadrant ? subRooms : [];

    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json(updatedRoom);
  } catch (error) {
    res.status(400).json({ message: 'Error updating room', error: error.message });
  }
};

// Delete a room
const deleteRoom = async (req, res) => {
  try {
    const deletedRoom = await Room.findByIdAndDelete(req.params.id);
    if (!deletedRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting room', error });
  }
};

const saveBuilding = async (req, res) => {
  try {
    const { building } = req.body;

    // Validate that the building field is provided
    if (!building) {
      return res.status(400).json({ message: 'Building is required' });
    }

    const newRoom = new Room({ building });
    const savedRoom = await newRoom.save();
    res.status(201).json(savedRoom);
  } catch (error) {
    console.error('Error saving building:', error);
    res.status(400).json({ message: 'Error saving building', error: error.message });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  saveBuilding, // Export the new function
};