const { Room, Subroom, Building, Category } = require('../models/');
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const multer = require('multer');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Create upload middleware for room image
const uploadRoomImage = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('roomImage');

// Create upload middleware for subroom images with improved error handling
const uploadSubroomImages = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  // Add this option to avoid throwing errors when the file is missing
  preservePath: true
}).fields([
  // Accept multiple potential subroom image fields
  { name: /^subroomImage_.*$/, maxCount: 1 }
]);

// Create Room with file upload
// Create Room with file upload and improved error handling
const createRoom = async (req, res) => {
  try {
    console.log("Creating room with form data");
    
    // Parse JSON data from form submission
    let roomData;
    try {
      console.log("Raw roomData:", req.body.roomData); // Log the raw data
      roomData = JSON.parse(req.body.roomData || '{}');
      console.log("Parsed room data:", roomData);
    } catch (parseError) {
      console.error("Error parsing roomData:", parseError);
      return res.status(400).json({ message: "Invalid roomData JSON", details: parseError.message });
    }
    
    const { subRooms, isQuadrant } = roomData;
    
    // Ensure roomId exists
    if (!roomData.roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }
    
    // Handle file upload - file information is in req.file if Multer processed it
    let roomImageFilename = null;
    if (req.file) {
      console.log("File uploaded:", req.file);
      roomImageFilename = req.file.filename;
    }
    
    // Verify that buildingId exists
    try {
      const buildingId = String(roomData.buildingId);
      const building = await Building.findByPk(buildingId);
      if (!building) {
        return res.status(400).json({ message: `Building with ID ${buildingId} does not exist` });
      }
    } catch (error) {
      return res.status(400).json({ message: `Error verifying buildingId: ${error.message}` });
    }
    
    // Verify that categoryId exists
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
    
    // Ensure roomCapacity is a valid number
    const roomCapacity = parseInt(roomData.roomCapacity, 10);
    if (isNaN(roomCapacity)) {
      return res.status(400).json({ message: `Invalid roomCapacity: ${roomData.roomCapacity}` });
    }
    
    // Ensure proper data types
    const formattedRoomData = {
      roomId: roomData.roomId,
      buildingId: String(roomData.buildingId),
      categoryId: parseInt(roomData.categoryId, 10),
      roomName: roomData.roomName,
      roomCapacity: roomCapacity,
      isQuadrant: Boolean(isQuadrant),
      roomImage: roomImageFilename,
      roomDescription: roomData.roomDescription || null,
      // Add explicit new Date() objects for timestamp fields
 createdAt: new Date(),
updatedAt: new Date(),

    };

    console.log("Formatted room data for database:", formattedRoomData);
    
    // Check required fields based on your model
    const requiredFields = ['roomId', 'buildingId', 'categoryId', 'roomName', 'roomCapacity'];
    for (const field of requiredFields) {
      if (formattedRoomData[field] === undefined || formattedRoomData[field] === null) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }
    
    try {
      // Create room with explicit field list to avoid timestamp issues
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
      
      console.log("Room created:", newRoom.roomId);
      
      // Create subrooms if the room is a quadrant
      if (isQuadrant && subRooms && subRooms.length > 0) {
        console.log("Creating subrooms:", subRooms.length);
        
        const subroomsToCreate = [];
        
        for (const subroom of subRooms) {
          const subroomData = {
            // Match your database column names exactly
            subRoomId: subroom.subroomId,
            roomId: newRoom.roomId,
            subRoomName: subroom.subroomName,
            subRoomCapacity: parseInt(subroom.subroomCapacity, 10),
            subRoomDescription: subroom.subroomDescription || null,
            subRoomImage: null,
            // Add explicit date fields
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Check if there's an uploaded image for this subroom
          const subroomImageKey = `subroomImage_${subroom.subroomId}`;
          if (req.files && req.files[subroomImageKey]) {
            subroomData.subRoomImage = req.files[subroomImageKey][0].filename;
          }
          
          subroomsToCreate.push(subroomData);
        }
        
        console.log("Subrooms to create:", subroomsToCreate);
        
        try {
          await Subroom.bulkCreate(subroomsToCreate, {
            fields: [
              'subRoomId', 
              'roomId', 
              'subRoomName', 
              'subRoomCapacity', 
              'subRoomDescription', 
              'subRoomImage',
              'createdAt',
              'updatedAt'
            ]
          });
          console.log("Subrooms created successfully");
        } catch (subroomError) {
          console.error("Error creating subrooms:", subroomError);
          // Continue anyway and return the room without subrooms
        }
      }
      
      // Return the newly created room
      const roomWithSubrooms = await Room.findByPk(newRoom.roomId, {
        include: [{ model: Subroom, as: 'subRooms' }]
      });
      
      // Add full URL for the room image
      const responseData = roomWithSubrooms.toJSON();
      if (responseData.roomImage) {
        responseData.roomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${responseData.roomImage}`;
      }
      
      // Add image URLs for subrooms
      if (responseData.subRooms && responseData.subRooms.length > 0) {
        responseData.subRooms = responseData.subRooms.map(subroom => {
          if (subroom.subRoomImage) {
            subroom.subRoomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${subroom.subRoomImage}`;
          }
          return subroom;
        });
      }
      
      res.status(201).json(responseData);
    } catch (dbError) {
      // Handle specific Sequelize errors
      console.error("Database error creating room:", dbError);
      
      if (dbError.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ 
          message: `A room with ID ${roomData.roomId} already exists`,
          error: dbError.message 
        });
      } else if (dbError.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ 
          message: `Foreign key constraint error. Please check buildingId and categoryId values.`,
          error: dbError.message,
          details: {
            table: dbError.table,
            fields: dbError.fields
          }
        });
      } else if (dbError.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          message: `Validation error`,
          errors: dbError.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }
      
      throw dbError; // Re-throw for general error handler
    }
  } catch (error) {
    console.error("Error creating room:", error);
    
    // Enhanced error logging
    const errorDetails = {
      message: 'Error creating room',
      error: error.message,
      stack: error.stack
    };
    
    res.status(500).json(errorDetails);
  }
};
// Get all rooms with filtering options
const getAllRooms = async (req, res) => {
  try {
    console.log("Fetching all rooms");
    
    // Optional filtering
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
    
    // Use a more explicit include option with explicit attributes
    const rooms = await Room.findAll({
      where,
      include: [
        { 
          model: Subroom, 
          as: 'subRooms',
          required: false // This makes it a LEFT JOIN
        },
        {
          model: Building,
          required: false
        },
        {
          model: Category,
          required: false
        }
      ],
      order: [['roomName', 'ASC']]
    });
    
    // Add image URLs to each room and its subrooms
    const roomsWithImageUrls = rooms.map(room => {
      const roomData = room.toJSON();
      
      // Add room image URL
      if (roomData.roomImage) {
        roomData.roomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${roomData.roomImage}`;
      }
      
      // Add subroom image URLs
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
    
    console.log(`Found ${rooms.length} rooms`);
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

// Fetch Room by ID with Subrooms and image URL
const getRoomById = async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`Fetching room with ID: ${id}`);
    
    const room = await Room.findByPk(id, {
      include: [
        { model: Subroom, as: 'subRooms' },
        { model: Building },
        { model: Category }
      ]
    });
    
    if (!room) {
      console.log(`Room with ID ${id} not found`);
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Add image URLs to the response
    const roomData = room.toJSON();
    
    // Add room image URL
    if (roomData.roomImage) {
      roomData.roomImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${roomData.roomImage}`;
    }
    
    // Add subroom image URLs
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

// Delete a room and its associated subrooms
const deleteRoom = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Attempting to delete room with ID: ${id}`);
    
    // First check if the room exists
    const room = await Room.findByPk(id, {
      include: [{ model: Subroom, as: 'subRooms' }]
    });
    
    if (!room) {
      console.log(`Room with ID ${id} not found`);
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Delete any room image file
    if (room.roomImage) {
      const imagePath = path.join(__dirname, '../public/uploads', room.roomImage);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Deleted room image file: ${room.roomImage}`);
        }
      } catch (deleteError) {
        console.error("Error deleting room image file:", deleteError);
        // Continue with deletion anyway
      }
    }
    
    // Delete any subroom image files
    const subrooms = room.subRooms || [];
    for (const subroom of subrooms) {
      if (subroom.subRoomImage) {
        const imagePath = path.join(__dirname, '../public/uploads', subroom.subRoomImage);
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Deleted subroom image file: ${subroom.subRoomImage}`);
          }
        } catch (deleteError) {
          console.error("Error deleting subroom image file:", deleteError);
          // Continue with deletion anyway
        }
      }
    }
    
    // Delete the room (this will cascade delete subrooms due to association)
    await Room.destroy({
      where: { roomId: id }
    });
    
    console.log(`Room ${id} successfully deleted`);
    res.status(200).json({ message: 'Room successfully deleted' });
  } catch (error) {
    console.error(`Error deleting room ${id}:`, error);
    res.status(500).json({
      message: 'Error deleting room',
      error: error.message
    });
  }
};

// Debug method to verify database structure and connectivity
const debugRoomStructure = async (req, res) => {
  try {
    // Get model structure
    const roomAttributes = Object.keys(Room.rawAttributes);
    const subroomAttributes = Object.keys(Subroom.rawAttributes);
    
    // Get database table structure
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
    
    // Check foreign key tables
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

// Process uploads and handle the request - for create
const processRoomCreate = (req, res, next) => {
  // First, handle the main room image
  uploadRoomImage(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error with room image: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: `Error processing room image: ${err.message}` });
    }
    
    // Try to parse the roomData first to check if we need to process subroom images
    try {
      const roomData = JSON.parse(req.body.roomData || '{}');
      
      // Only process subroom images if this is a quadrant room with subrooms
      if (roomData.isQuadrant && roomData.subRooms && roomData.subRooms.length > 0) {
        // Process any subroom images
        uploadSubroomImages(req, res, function(err) {
          if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Multer error with subroom images: ${err.message}` });
          } else if (err) {
            return res.status(400).json({ message: `Error processing subroom images: ${err.message}` });
          }
          createRoom(req, res);
        });
      } else {
        // No subrooms, just process the room
        createRoom(req, res);
      }
    } catch (error) {
      return res.status(400).json({ message: `Invalid roomData JSON: ${error.message}` });
    }
  });
};

// Process uploads and handle the request - for update
const processRoomUpdate = (req, res, next) => {
  // First, handle the main room image
  uploadRoomImage(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error with room image: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: `Error processing room image: ${err.message}` });
    }
    
    // Try to parse the roomData first to check if we need to process subroom images
    try {
      const roomData = JSON.parse(req.body.roomData || '{}');
      
      // Only process subroom images if this is a quadrant room with subrooms
      if (roomData.isQuadrant && roomData.subRooms && roomData.subRooms.length > 0) {
        // Process any subroom images
        uploadSubroomImages(req, res, function(err) {
          if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Multer error with subroom images: ${err.message}` });
          } else if (err) {
            return res.status(400).json({ message: `Error processing subroom images: ${err.message}` });
          }
          updateRoom(req, res);
        });
      } else {
        // No subrooms, just process the room update
        updateRoom(req, res);
      }
    } catch (error) {
      return res.status(400).json({ message: `Invalid roomData JSON: ${error.message}` });
    }
  });
};

module.exports = {
  createRoom: processRoomCreate,
  getAllRooms,
  getRoomById,
  updateRoom: processRoomUpdate,
  deleteRoom,
  debugRoomStructure
};