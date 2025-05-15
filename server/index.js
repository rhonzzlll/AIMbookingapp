const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer'); // Added for file uploads
const path = require('path'); // For path operations
const fs = require('fs'); // For directory operations

const app = express();

// Load Sequelize instance
const db = require('./models');
const sequelize = db.sequelize;

// SET THE DB TO THE APP - THIS IS THE CRITICAL ADDITION
app.set('db', db);

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public/uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExt);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Make upload available throughout the app
app.locals.upload = upload;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from the uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Import routes
const { router: authRoutes } = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/roomRoutes');
const bookingsRoutes = require('./routes/bookingsRoutes');
const buildingRoutes = require('./routes/buildingRoutes');  // capital R if file is named buildingRoutes.js

const categoryRoutes = require('./routes/categoryRoutes');

// Mount routes
app.use('/api/bookings', bookingsRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/categories', categoryRoutes);

// Error handler for multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large. Maximum file size is 5MB.' 
      });
    }
    return res.status(400).json({ 
      error: `Upload error: ${err.message}` 
    });
  } else if (err) {
    // An unknown error occurred
    console.error('Server error:', err);
    return res.status(500).json({ 
      error: 'Internal server error during file upload' 
    });
  }
  next();
});

// Test route for DB
app.get('/', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).send({
      message: 'Welcome to Booking App',
      database: 'Connected to SQL',
      upload: 'Multer file upload configured'
    });
  } catch (error) {
    console.error('Error checking database connection:', error);
    res.status(500).send({
      message: 'Welcome to Booking App',
      database: 'Error checking database connection',
    });
  }
});

// Authenticate DB at startup
sequelize.authenticate()
  .then(() => {
    console.log('Connected to the database successfully.');
  })
  .catch((err) => {
    console.error('Failed to connect to the database:', err);
  });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
