const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
 
const authenticate = async (req, res, next) => {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Extract token from header
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }
    
    // Add user object to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Token is not valid, authorization denied' });
  }
};

// Authorization helper function for admin access
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

// POST route for login
router.post('/', async (req, res) => {
  const { email, password } = req.body;
  
  // Validate request body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }
    
    // Debugging: Log the role of the user
    console.log('User role:', user.role);
    
    // Check if the user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }
    
    // Compare the provided password with the hashed password in the database
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for email:', email);
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }
    
    // Normalize role to lowercase for consistency in token payload
    const normalizedRole = user.role.toLowerCase();
    
    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, role: normalizedRole }, // Include normalized role in the payload
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    
    // Send the response with the token and user details
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role, // Return original role format
      token,
      message: 'Logged in successfully',
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Something went wrong! Please try again.' });
  }
});

// Update user password - add authentication
router.put('/update-password', authenticate, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Email, current password, and new password are required' });
  }
  
  try {
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update with new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Something went wrong! Please try again.' });
  }
});

// Export both the router and auth functions
module.exports = {
  router,
  authenticate,
  authorizeAdmin
};