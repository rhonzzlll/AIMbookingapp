const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB || 'mongodb://127.0.0.1:27017/book', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    console.log('Connected to MongoDB...');

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connection state:', mongoose.connection.readyState);
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
  } catch (err) {
    console.error('Could not connect to MongoDB...', err);
    process.exit(1);
  }
};

connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Import routes
const { router: authRoutes } = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/roomRoutes');
const bookingsRoutes = require('./routes/bookingsRoutes');
const roomsRoutes = require('./routes/roomRoutes');
 
app.use('/api/bookings', bookingsRoutes);
app.use('/api/rooms', roomsRoutes);
 




// API routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);






// Test route
app.get('/', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 1 = connected, 0 = disconnected
    const dbStatus = dbState === 1 ? 'Connected to MongoDB' : 'Not connected to MongoDB';

    res.status(200).send({
      message: 'Welcome to Booking App',
      database: dbStatus,
    });
  } catch (error) {
    console.error('Error checking database connection:', error);
    res.status(500).send({
      message: 'Welcome to Booking App',
      database: 'Error checking database connection',
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));