const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Load Sequelize instance
const db = require('./models');
const sequelize = db.sequelize; // <==  This line fixes the ReferenceError

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Import routes
const { router: authRoutes } = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/roomRoutes');
const bookingsRoutes = require('./routes/bookingsRoutes');
const buildingRoutes = require('./routes/buildingroutes');
const categoryRoutes = require('./routes/categoryRoutes');
// Mount routes
app.use('/api/bookings', bookingsRoutes);
app.use('/api/rooms', roomRoutes); // No need to register twice
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/categories', categoryRoutes);

// Test route for DB
app.get('/', async (req, res) => {
  try {
    await sequelize.authenticate(); // Use Sequelize, not Mongoose
    res.status(200).send({
      message: 'Welcome to Booking App',
      database: 'Connected to SQL',
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
    console.error(' Failed to connect to the database:', err);
  });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
