const { Room, Subroom, Building, Category } = require('../models');
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const multer = require('multer');

// --- FIXED HELPER FUNCTION FOR SQL SERVER ---
function formatDateForSQL(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}
function getCurrentTimestamp() {
  return new Date();
}
// -------------------------------------------

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadRoomAndSubroomImages = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).any();

// Create Room with file upload
const createRoom = async (req, res) => {
  try {
    let roomData;
    try {
      roomData = JSON.parse(req.body.roomData || '{}');
    } catch (parseError) {
      return res.status(400).json({ message: "Invalid roomData JSON", details: parseError.message });
    }

    const { subRooms, isQuadrant } = roomData;

    if (!roomData.roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const roomImageFile = req.files.find(f => f.fieldname === 'roomImage');
    let roomImageFilename = roomImageFile ? roomImageFile.filename : null;

    const subroomImageMap = {};
    req.files.forEach(f => {
      if (f.fieldname.startsWith('subroomImage_')) {
        subroomImageMap[f.fieldname] = f.filename;
      }
    });

    try {
      const buildingId = String(roomData.buildingId);
      const building = await Building.findByPk(buildingId);
      if (!building) {
        return res.status(400).json({ message: `Building with ID ${buildingId} does not exist` });
      }
    } catch (error) {
      return res.status(400).json({ message: `Error verifying buildingId: ${error.message}` });
    }

    try {
      const categoryId = parseInt(roomData.categoryId, 10);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: `Invalid categoryId: ${roomData.categoryId}` });
      }
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({ message: `Category with ID ${categoryId} does not exist` });
      }
    } catch (error) {
      return res.status(400).json({ message: `Error verifying categoryId: ${error.message}` });
    }

    const roomCapacity = parseInt(roomData.roomCapacity, 10);
    if (isNaN(roomCapacity)) {
      return res.status(400).json({ message: `Invalid roomCapacity: ${roomData.roomCapacity}` });
    }

    const now = getCurrentTimestamp();
    const formattedRoomData = {
      roomId: roomData.roomId,
      buildingId: String(roomData.buildingId),
      categoryId: parseInt(roomData.categoryId, 10),
      roomName: roomData.roomName,
      roomCapacity: roomCapacity,
      isQuadrant: Boolean(isQuadrant),
      roomImage: roomImageFilename,
      roomDescription: roomData.roomDescription || null,
      createdAt: now,
      updatedAt: now,
    };

    const requiredFields = ['roomId', 'buildingId', 'categoryId', 'roomName', 'roomCapacity'];
    for (const field of requiredFields) {
      if (formattedRoomData[field] === undefined || formattedRoomData[field] === null) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    const newRoom = await Room.create(formattedRoomData, {
      fields: [
        'roomId',
        'buildingId',
        'categoryId',
        'roomName',
        'roomCapacity',
        'isQuadrant',
        'roomImage',
        'roomDescription',
        'createdAt',
        'updatedAt'
      ]
    });

    // --- ADD THIS BLOCK ---
    if (isQuadrant && subRooms && subRooms.length > 0) {
      const now = getCurrentTimestamp();
      for (const subroom of subRooms) {
        if (!subroom.subroomId || !subroom.subroomName || !subroom.subroomCapacity) continue;
        const subroomImageKey = `subroomImage_${subroom.subroomId}`;
        const subRoomImage = subroomImageMap[subroomImageKey] || roomImageFilename;
        const subroomCapacity = parseInt(subroom.subroomCapacity, 10);
        // Insert subroom as a real Room row
        await Room.create({
          roomId: subroom.subroomId,
          buildingId: formattedRoomData.buildingId,
          categoryId: formattedRoomData.categoryId,
          roomName: subroom.subroomName,
          roomCapacity: subroomCapacity,
          isQuadrant: false,
          roomImage: subRoomImage,
          roomDescription: subroom.subroomDescription || null,
          parentRoomId: newRoom.roomId, // <-- relate to parent
          createdAt: now,
          updatedAt: now
        });
      }
    }
    // --- END BLOCK ---

    const roomWithSubrooms = await Room.findByPk(newRoom.roomId, {
      include: [{ model: Subroom, as: 'subRooms' }]
    });
    const responseData = roomWithSubrooms.toJSON();
    if (responseData.roomImage) {
      responseData.roomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${responseData.roomImage}`;
    }
    if (responseData.subRooms && responseData.subRooms.length > 0) {
      responseData.subRooms = responseData.subRooms.map(subroom => {
        if (subroom.subRoomImage) {
          subroom.subRoomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${subroom.subRoomImage}`;
        }
        return subroom;
      });
    }
    res.status(201).json(responseData);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({
      message: 'Error creating room',
      error: error.message,
      stack: error.stack
    });
  }
};

// Update Room with file upload and subroom support
const updateRoom = async (req, res) => {
  try {
    let roomData;
    try {
      roomData = JSON.parse(req.body.roomData || '{}');
    } catch (parseError) {
      return res.status(400).json({ message: "Invalid roomData JSON", details: parseError.message });
    }

    const roomId = req.params.id;
    const { subRooms, isQuadrant } = roomData;

    const room = await Room.findByPk(roomId, { include: [{ model: Subroom, as: 'subRooms' }] });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const roomImageFile = req.files.find(f => f.fieldname === 'roomImage');
    let roomImageFilename = room.roomImage;
    if (roomImageFile) {
      if (room.roomImage) {
        const oldImagePath = path.join(__dirname, '../public/uploads', room.roomImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      roomImageFilename = roomImageFile.filename;
    }

    const subroomImageMap = {};
    req.files.forEach(f => {
      if (f.fieldname.startsWith('subroomImage_')) {
        subroomImageMap[f.fieldname] = f.filename;
      }
    });

    room.buildingId = String(roomData.buildingId);
    room.categoryId = parseInt(roomData.categoryId, 10);
    room.roomName = roomData.roomName;
    room.roomCapacity = parseInt(roomData.roomCapacity, 10);
    room.isQuadrant = Boolean(isQuadrant);
    room.roomImage = roomImageFilename;
    room.roomDescription = roomData.roomDescription || null;
    room.updatedAt = getCurrentTimestamp();

    await room.save();

    if (isQuadrant && Array.isArray(subRooms)) {
      const existingSubroomIds = room.subRooms.map(sr => sr.subroomId);
      const incomingSubroomIds = subRooms.map(sr => sr.subroomId);
      const subroomsToDelete = existingSubroomIds.filter(id => !incomingSubroomIds.includes(id));
      if (subroomsToDelete.length > 0) {
        await Subroom.destroy({ where: { subroomId: subroomsToDelete } });
      }

      const updateTimestamp = getCurrentTimestamp();
      for (const subroom of subRooms) {
        if (!subroom.subroomId || !subroom.subroomName || !subroom.subroomCapacity) {
          console.error("Invalid subroom data during update:", subroom);
          continue;
        }

        const subroomImageKey = `subroomImage_${subroom.subroomId}`;
        const subRoomImage = subroomImageMap[subroomImageKey] || roomImageFilename;

        const existing = room.subRooms.find(sr => sr.subroomId === subroom.subroomId);
        if (existing && subroomImageMap[subroomImageKey] && existing.subRoomImage) {
          const oldSubImagePath = path.join(__dirname, '../public/uploads', existing.subRoomImage);
          if (fs.existsSync(oldSubImagePath)) {
            fs.unlinkSync(oldSubImagePath);
          }
        }

        const subroomCapacity = parseInt(subroom.subroomCapacity, 10);
        if (isNaN(subroomCapacity)) {
          console.error("Invalid subroom capacity during update:", subroom.subroomCapacity);
          continue;
        }

        const upsertData = {
          subroomId: subroom.subroomId,
          roomId: room.roomId,
          subRoomName: subroom.subroomName,
          subRoomCapacity: subroomCapacity,
          subRoomDescription: subroom.subroomDescription || null,
          subRoomImage,
          updatedAt: updateTimestamp
        };

        if (!existingSubroomIds.includes(subroom.subroomId)) {
          upsertData.createdAt = updateTimestamp;
        }

        await Subroom.upsert(upsertData);
      }
    } else {
      await Subroom.destroy({ where: { roomId: room.roomId } });
    }

    const updatedRoom = await Room.findByPk(room.roomId, {
      include: [{ model: Subroom, as: 'subRooms' }]
    });
    const responseData = updatedRoom.toJSON();
    if (responseData.roomImage) {
      responseData.roomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${responseData.roomImage}`;
    }
    if (responseData.subRooms && responseData.subRooms.length > 0) {
      responseData.subRooms = responseData.subRooms.map(subroom => {
        if (subroom.subRoomImage) {
          subroom.subRoomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${subroom.subRoomImage}`;
        }
        return subroom;
      });
    }
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ message: "Error updating room", error: error.message });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const { buildingId, categoryId, search } = req.query;
    const where = {};

    if (buildingId) {
      where.buildingId = buildingId;
    }
    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }
    if (search) {
      where[Sequelize.Op.or] = [
        { roomName: { [Sequelize.Op.like]: `%${search}%` } },
        { roomDescription: { [Sequelize.Op.like]: `%${search}%` } }
      ];
    }

    const rooms = await Room.findAll({
      where,
      include: [
        { model: Subroom, as: 'subRooms', required: false },
        { model: Building, required: false },
        { model: Category, required: false }
      ],
      order: [['roomName', 'ASC']]
    });

    const roomsWithImageUrls = rooms.map(room => {
      const roomData = room.toJSON();
      if (roomData.roomImage) {
        roomData.roomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${roomData.roomImage}`;
      }
      if (roomData.subRooms && roomData.subRooms.length > 0) {
        roomData.subRooms = roomData.subRooms.map(subroom => {
          if (subroom.subRoomImage) {
            subroom.subRoomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${subroom.subRoomImage}`;
          }
          return subroom;
        });
      }
      return roomData;
    });

    res.status(200).json(roomsWithImageUrls);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({
      message: 'Error fetching rooms',
      error: error.message,
      stack: error.stack
    });
  }
};

const getRoomById = async (req, res) => {
  const { id } = req.params;
  try {
    const room = await Room.findByPk(id, {
      include: [
        { model: Subroom, as: 'subRooms' },
        { model: Building },
        { model: Category }
      ]
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const roomData = room.toJSON();
    if (roomData.roomImage) {
      roomData.roomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${roomData.roomImage}`;
    }
    if (roomData.subRooms && roomData.subRooms.length > 0) {
      roomData.subRooms = roomData.subRooms.map(subroom => {
        if (subroom.subRoomImage) {
          subroom.subRoomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${subroom.subRoomImage}`;
        }
        return subroom;
      });
    }
    res.status(200).json(roomData);
  } catch (error) {
    console.error(`Error fetching room ${id}:`, error);
    res.status(500).json({
      message: 'Error fetching room',
      error: error.message
    });
  }
};

const deleteRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const room = await Room.findByPk(id, {
      include: [{ model: Subroom, as: 'subRooms' }]
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.roomImage) {
      const imagePath = path.join(__dirname, '../public/uploads', room.roomImage);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (deleteError) {
        console.error("Error deleting room image file:", deleteError);
      }
    }

    const subrooms = room.subRooms || [];
    for (const subroom of subrooms) {
      if (subroom.subRoomImage) {
        const imagePath = path.join(__dirname, '../public/uploads', subroom.subRoomImage);
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (deleteError) {
          console.error("Error deleting subroom image file:", deleteError);
        }
      }
    }

    await Room.destroy({
      where: { roomId: id }
    });

    res.status(200).json({ message: 'Room successfully deleted' });
  } catch (error) {
    console.error(`Error deleting room ${id}:`, error);
    res.status(500).json({
      message: 'Error deleting room',
      error: error.message
    });
  }
};

const debugRoomStructure = async (req, res) => {
  try {
    const roomAttributes = Object.keys(Room.rawAttributes);
    const subroomAttributes = Object.keys(Subroom.rawAttributes);

    const [roomColumns] = await Room.sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'room'
    `);

    const [subroomColumns] = await Room.sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'subroom'
    `);

    const [buildings] = await Room.sequelize.query(`
      SELECT TOP 5 buildingId FROM building
    `);

    const [categories] = await Room.sequelize.query(`
      SELECT TOP 5 categoryId FROM category
    `);

    res.status(200).json({
      roomModel: {
        tableName: Room.tableName,
        schema: Room.options.schema,
        attributes: roomAttributes
      },
      subroomModel: {
        tableName: Subroom.tableName,
        schema: Subroom.options.schema,
        attributes: subroomAttributes
      },
      database: {
        roomColumns,
        subroomColumns
      },
      foreignKeyData: {
        sampleBuildingIds: buildings,
        sampleCategoryIds: categories
      }
    });
  } catch (error) {
    console.error('Error debugging room structure:', error);
    res.status(500).json({
      message: 'Error fetching debug info',
      error: error.message
    });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  debugRoomStructure,
  uploadRoomAndSubroomImages
};