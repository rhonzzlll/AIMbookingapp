const { Room, Subroom } = require('../models');
const crypto = require('crypto'); // For generating a shortened image name

// Process the image to generate a shortened name and base64 string
const processImage = (image) => {
  if (!image) return null;

  const shortenedName = crypto.randomBytes(8).toString('hex'); // Generate a unique name
  return { shortenedName };
};

// Validate subrooms for correct structure and required fields
const validateSubRooms = (subRooms) => {
  if (!Array.isArray(subRooms)) {
    throw new Error('Subrooms must be an array');
  }

  subRooms.forEach((subRoom, index) => {
    if (!subRoom.roomName || typeof subRoom.roomName !== 'string') {
      throw new Error(`Subroom at index ${index} must have a valid roomName`);
    }
    
    if (subRoom.capacity === undefined || typeof subRoom.capacity !== 'number') {
      throw new Error(`Subroom at index ${index} must have a valid capacity`);
    }
    
    // Provide a default description if missing
    if (!subRoom.description) {
      subRoom.description = `Subroom ${index + 1}`;
    } else if (typeof subRoom.description !== 'string') {
      throw new Error(`Subroom at index ${index} must have a valid description`);
    }
  });
};

// Get all rooms
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll({
      include: { model: Subroom, as: 'subRooms' }
    });
    res.status(200).json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Error fetching rooms', error });
  }
};

// Get a single room by ID
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({
      where: { roomId: req.params.id },
      include: { model: Subroom, as: 'subRooms' }
    });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
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
    if (!roomData.roomName || !roomData.buildingId || !roomData.roomCapacity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate subrooms if isQuadrant is true
    if (isQuadrant) {
      validateSubRooms(subRooms);
    }

    // Process the image if available
    const processedImage = processImage(roomImage);

    // Create and save the room
    const newRoom = await Room.create({
      ...roomData,
      isQuadrant: !!isQuadrant, // Ensure isQuadrant is a boolean
      roomImage: processedImage ? processedImage.shortenedName : null, // Save the base64 image name if available
    });

    // If there are subrooms, create them and associate with the new room
    if (isQuadrant && subRooms.length > 0) {
      const subroomsToCreate = subRooms.map(subRoom => ({
        roomId: newRoom.roomId, // Associate subrooms with the created room
        ...subRoom
      }));
      await Subroom.bulkCreate(subroomsToCreate);
    }

    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(400).json({ message: 'Error creating room', error: error.message });
  }
};

// Update an existing room
const updateRoom = async (req, res) => {
  try {
    const { roomImage, subRooms, isQuadrant, ...roomData } = req.body;

    console.log('Update payload received:', {
      roomId: req.params.id,
      roomData,
      isQuadrant,
      subRoomCount: subRooms?.length || 0
    });

    // Validate subrooms if isQuadrant is true
    if (isQuadrant && subRooms) {
      try {
        validateSubRooms(subRooms);
      } catch (validationError) {
        console.error('Subroom validation error:', validationError);
        return res.status(400).json({ 
          message: 'Invalid subroom data', 
          error: validationError.message 
        });
      }
    }

    // Process the image if provided
    let updatedData = { ...roomData, isQuadrant };
    if (roomImage) {
      const processedImage = processImage(roomImage);
      updatedData.roomImage = processedImage ? processedImage.shortenedName : null;
    }

    // Only include subRooms if isQuadrant is true
    updatedData.subRooms = isQuadrant && subRooms ? subRooms : [];

    const updatedRoom = await Room.update(updatedData, {
      where: { roomId: req.params.id },
      returning: true,
      plain: true
    });

    if (!updatedRoom[1]) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // If there are subrooms to update, handle them
    if (isQuadrant && subRooms) {
      await Subroom.destroy({ where: { roomId: req.params.id } }); // Delete existing subrooms
      const subroomsToCreate = subRooms.map(subRoom => ({
        roomId: req.params.id, // Associate subrooms with the updated room
        ...subRoom
      }));
      await Subroom.bulkCreate(subroomsToCreate);
    }

    res.status(200).json(updatedRoom[1]);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(400).json({ 
      message: 'Error updating room', 
      error: error.message || 'Unknown error' 
    });
  }
};

// Delete a room
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ where: { roomId: req.params.id } });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Delete associated subrooms if any
    await Subroom.destroy({ where: { roomId: req.params.id } });

    await room.destroy();
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Error deleting room', error });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
