const { Building, Room, Category } = require('../models/');

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

// Create upload middleware for building image
const uploadBuildingImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('buildingImage');

// Create a new Building with file upload
const createBuilding = async (req, res) => {
  try {
    console.log("Creating building with form data");
    
    // Parse building data from request body
    let buildingData;
    try {
      if (req.body.buildingData) {
        buildingData = JSON.parse(req.body.buildingData);
      } else {
        buildingData = req.body;
      }
      console.log("Parsed building data:", buildingData);
    } catch (parseError) {
      console.error("Error parsing buildingData:", parseError);
      return res.status(400).json({ message: "Invalid buildingData JSON", details: parseError.message });
    }
    
    const { buildingName, buildingDescription, createdAt, updatedAt } = buildingData;

    // Basic validation
    if (!buildingName) {
      return res.status(400).json({ message: 'Building name is required' });
    }

    // Generate a numeric ID (6-digit number)
      const buildingId = Math.floor(100000 + Math.random() * 900000);

    // Handle file upload - file information is in req.file if Multer processed it
    let buildingImageFilename = null;
    if (req.file) {
      console.log("File uploaded:", req.file);
      buildingImageFilename = req.file.filename;
    } else if (buildingData.buildingImage && !buildingData.buildingImage.startsWith('http')) {
      // For base64 image data from the request
      buildingImageFilename = buildingData.buildingImage;
    }

    // Create a new building record with all fields
    const newBuilding = await Building.create({
      buildingId,
      buildingName,
      buildingDescription,
      buildingImage: buildingImageFilename,
      createdAt: createdAt || new Date(),
      updatedAt: updatedAt || new Date()
    });

    // Add image URL to the response
    const responseData = newBuilding.toJSON();
    if (responseData.buildingImage && !responseData.buildingImage.startsWith('http')) {
      responseData.buildingImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${responseData.buildingImage}`;
    }

    // Return the newly created building
    res.status(201).json(responseData);
  } catch (err) {
    console.error('Create Building Error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        message: 'Building ID already exists. Please try again.'
      });
    }
    res.status(500).json({ error: err.message });
  }
};

// Update an existing Building with file upload
const updateBuilding = async (req, res) => {
  try {
    console.log("Updating building with form data");
    
    // Parse building data from request body
    let buildingData;
    try {
      if (req.body.buildingData) {
        buildingData = JSON.parse(req.body.buildingData);
      } else {
        buildingData = req.body;
      }
      console.log("Parsed building data for update:", buildingData);
    } catch (parseError) {
      console.error("Error parsing buildingData:", parseError);
      return res.status(400).json({ message: "Invalid buildingData JSON", details: parseError.message });
    }
    
    const { buildingName, buildingDescription, updatedAt } = buildingData;

    // Find the building first to ensure it exists
    const building = await Building.findByPk(req.params.id);
    
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Handle file upload - file information is in req.file if Multer processed it
    let buildingImageFilename = building.buildingImage; // Default to existing image
    
    if (req.file) {
      console.log("New file uploaded:", req.file);
      
      // Delete the old image file if it exists
      if (building.buildingImage && !building.buildingImage.startsWith('http')) {
        const oldImagePath = path.join(__dirname, '../public/uploads', building.buildingImage);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`Deleted old building image: ${building.buildingImage}`);
          }
        } catch (deleteError) {
          console.error("Error deleting old image file:", deleteError);
          // Continue with update anyway
        }
      }
      
      buildingImageFilename = req.file.filename;
    } else if (buildingData.buildingImage) {
      // If the image is a URL or unchanged, keep it
      if (buildingData.buildingImage.startsWith('http')) {
        buildingImageFilename = buildingData.buildingImage;
      } else if (buildingData.buildingImage !== building.buildingImage) {
        // If it's base64 data and different from the existing image
        buildingImageFilename = buildingData.buildingImage;
      }
    }

    // Update the building with new values
    await building.update({
      buildingName: buildingName || building.buildingName,
      buildingDescription,
      buildingImage: buildingImageFilename,
      updatedAt: updatedAt || new Date()
    });

    // Fetch the updated building to return
    const updatedBuilding = await Building.findByPk(req.params.id);
    
    // Add image URL to the response
    const responseData = updatedBuilding.toJSON();
    if (responseData.buildingImage && !responseData.buildingImage.startsWith('http')) {
      responseData.buildingImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${responseData.buildingImage}`;
    }
    
    res.json(responseData);
  } catch (err) {
    console.error('Update Building Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a Building and its image file
const deleteBuilding = async (req, res) => {
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

    // Delete the building image file if it exists and is not a URL
    if (building.buildingImage && !building.buildingImage.startsWith('http')) {
      const imagePath = path.join(__dirname, '../public/uploads', building.buildingImage);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Deleted building image file: ${building.buildingImage}`);
        }
      } catch (deleteError) {
        console.error("Error deleting building image file:", deleteError);
        // Continue with deletion anyway
      }
    }

    // Delete the building
    await building.destroy();
    res.json({ message: 'Building deleted successfully' });
  } catch (err) {
    console.error('Delete Building Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Retrieve all Buildings with image URLs
const getAllBuildings = async (req, res) => {
  try {
    const buildings = await Building.findAll();

    const buildingsWithImageUrls = buildings.map(building => {
      const buildingData = building.toJSON();
 

      if (buildingData.buildingImage && !buildingData.buildingImage.startsWith('http')) {
        buildingData.buildingImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${buildingData.buildingImage}`;
      }

      return buildingData;
    });

    res.json(buildingsWithImageUrls);
  } catch (err) {
    console.error('Get All Buildings Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Retrieve a single Building by ID with image URL
const getBuildingById = async (req, res) => {
  try {
    const building = await Building.findByPk(req.params.id);

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Add image URL to the response
    const buildingData = building.toJSON();
    if (buildingData.buildingImage && !buildingData.buildingImage.startsWith('http')) {
      buildingData.buildingImageUrl = `${req.protocol}://${req.get('host')}/api/uploads/${buildingData.buildingImage}`;
    }

    res.json(buildingData);
  } catch (err) {
    console.error('Get Building By ID Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Process uploads and handle the request - for create
const processBuildingCreate = (req, res) => {
  uploadBuildingImage(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error with building image: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: `Error processing building image: ${err.message}` });
    }
    
    createBuilding(req, res);
  });
};

// Process uploads and handle the request - for update
const processBuildingUpdate = (req, res) => {
  uploadBuildingImage(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error with building image: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: `Error processing building image: ${err.message}` });
    }
    
    updateBuilding(req, res);
  });
};

module.exports = {
  createBuilding: processBuildingCreate,
  getAllBuildings,
  getBuildingById,
  updateBuilding: processBuildingUpdate,
  deleteBuilding
};