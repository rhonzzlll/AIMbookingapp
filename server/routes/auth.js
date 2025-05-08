const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware: Authenticate User
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db.User.findOne({
      where: { userId: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }

    // Normalize user data and role before attaching
    req.user = {
      ...user.toJSON(),
      role: user.role.toLowerCase(), // normalize role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Token is not valid, authorization denied' });
  }
};

// Middleware: Authorize Admin
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

// Login route
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }

    const token = jwt.sign(
      { id: user.userId, role: user.role.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token,
      message: 'Logged in successfully',
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Something went wrong! Please try again.' });
  }
});

// Update password route
router.put('/update-password', authenticate, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Email, current password, and new password are required' });
  }

  try {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Something went wrong! Please try again.' });
  }
});

module.exports = {
  router,
  authenticate,
  authorizeAdmin,
};
