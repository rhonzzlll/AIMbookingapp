const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const axios = require('axios');

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

    const user = await db.User.findOne({ where: { userId: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }
    req.user = { ...user.toJSON() };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Token is not valid, authorization denied' });
  }
};

// Middleware: Authorize Admin
const authorizeAdmin = (req, res, next) => {
  if (
    req.user &&
    req.user.role &&
    (req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'superadmin')
  ) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

// Middleware: Authorize Super Admin
const authorizeSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role && req.user.role.toLowerCase() === 'superadmin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }
};

// Login route
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Ensure hardcoded admin exists
    if (
      email === 'rasantos@aim.edu' &&
      password === '123456'
    ) {
      let adminUser = await db.User.findOne({ where: { email } });
      if (!adminUser) {
        adminUser = await db.User.create({
          firstName: 'rhonzel',
          lastName: 'santos',
          email: 'rasantos@aim.edu',
          password: '123456', // <-- plain text, let the hook hash it
          role: 'Admin',
          isActive: true,
        });
      }
    }

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

// Reset password (admin only)
router.post('/reset-password/:id', authenticate, authorizeAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID format" });

  try {
    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If you have a hook, do NOT hash here:
    user.password = '123456';
    await user.save();

    return res.status(200).json({ message: "Password has been reset to '123456'." });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// Only Super Admins
router.delete('/dangerous-action', authenticate, authorizeSuperAdmin, async (req, res) => {
  // Implementation for dangerous action
});

// Admins or Super Admins
router.post('/admin-action', authenticate, authorizeAdmin, async (req, res) => {
  // Implementation for admin action
});

// Microsoft SSO config
const TENANT_ID = '22ca3d67-8165-476e-b918-4b2e31e047ba';
const CLIENT_ID = 'c1f688aa-ec46-42be-937a-3a020e6a6524';

// Helper to get Microsoft public keys (cached)
let msKeysCache = null;
async function getMicrosoftKeys() {
  if (msKeysCache) return msKeysCache;
  const res = await axios.get(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`);
  msKeysCache = res.data.keys;
  return msKeysCache;
}

// Validate Microsoft ID token
async function validateMicrosoftToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) throw new Error('Invalid token');
  const kid = decoded.header.kid;
  const keys = await getMicrosoftKeys();
  const key = keys.find(k => k.kid === kid);
  if (!key) throw new Error('Key not found');
  // Build public key
  const pubKey = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
  // Verify token
  return jwt.verify(idToken, pubKey, {
    algorithms: ['RS256'],
    audience: CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`
  });
}

// Microsoft SSO endpoint
router.post('/microsoft', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'No idToken provided' });

  try {
    const msUser = await validateMicrosoftToken(idToken);

    // Extract names robustly
    const email = msUser.email || msUser.preferred_username || msUser.upn;
    const firstName = msUser.given_name || msUser.name?.split(' ')[0] || '';
    const lastName = msUser.family_name || msUser.name?.split(' ').slice(1).join(' ') || '';

    if (!email) return res.status(400).json({ message: 'No email found in Microsoft token' });

    let user = await db.User.findOne({ where: { email } });

    if (!user) {
      user = await db.User.create({
        firstName,
        lastName,
        email,
        password: null,
        role: 'User',
        isActive: true,
      });
    } else {
      // Optionally update names if changed in Microsoft
      user.firstName = firstName;
      user.lastName = lastName;
      await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }

    const token = jwt.sign(
      { id: user.userId, role: user.role.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error('Microsoft SSO error:', err);
    res.status(401).json({ message: 'Invalid Microsoft token', error: err.message });
  }
});

module.exports = {
  router,
  authenticate,
  authorizeAdmin,
  authorizeSuperAdmin,
};