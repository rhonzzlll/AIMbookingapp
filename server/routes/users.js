const express = require("express");
const router = express.Router();
const { User, sequelize } = require("../models"); // Import sequelize instance
const bcrypt = require("bcryptjs");
const { authenticate, authorizeAdmin } = require("../routes/auth");
const multer = require("multer");
const path = require("path");

// Multer config (reuse your main app's config if possible)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExt);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Input validation middleware
const validateUserInput = (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;
  
  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ message: "Please provide all required fields." });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }
  
  // Role validation
  const normalizedRole = role.toLowerCase();
  if (!["admin", "user"].includes(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role. Must be 'Admin' or 'User'." });
  }
  
  // Add normalized role to request for later use
  req.normalizedRole = normalizedRole;
  next();
};

// GET all users (no passwords)
router.get("/", authenticate, async (req, res) => {
  try {
    const users = await User.scope('withoutPassword').findAll();
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// GET a user by ID
router.get("/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID format" });

  try {
    const user = await User.scope('withoutPassword').findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// POST: Register a user (admin only)
router.post("/", authenticate, authorizeAdmin, validateUserInput, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, isActive = true } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user with proper case for role
    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // Will be hashed by hook in User model
      department,
      role: req.normalizedRole === "admin" ? "Admin" : "User", // Match the enum case
      isActive
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});
 // PUT: Update user (self or admin)
router.put("/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID format" });

  // Begin transaction
  const transaction = await sequelize.transaction();
  
  try {
    const user = await User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    // Only allow if the user is updating their own profile or is admin
    if (Number(req.user.userId) !== id && req.user.role.toLowerCase() !== "admin") {
      await transaction.rollback();
      return res.status(403).json({ message: "Access denied. You can only update your own profile." });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      department,
      profileImage,
      birthdate,
      role,
      isActive
    } = req.body;

    // Basic email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await transaction.rollback();
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      user.email = email;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department) user.department = department;
    if (birthdate) user.birthdate = birthdate;
    if (profileImage) user.profileImage = profileImage;

    // Explicitly hash password if provided
    if (password) {
      // You could add password validation here for strength (optional)
      user.password = await bcrypt.hash(password, 10);
    }

    if (req.user.role.toLowerCase() === "admin") {
      if (role) {
        const normalizedRole = role.toLowerCase();
        if (!["admin", "user"].includes(normalizedRole)) {
          await transaction.rollback();
          return res.status(400).json({ message: "Invalid role. Must be 'Admin' or 'User'." });
        }
        user.role = normalizedRole === "admin" ? "Admin" : "User";
      }

      if (isActive !== undefined) user.isActive = isActive;
    }

    // Save the user
    await user.save({ transaction });
    await transaction.commit();

    // Return user without password
    const userResponse = user.toJSON();
    delete userResponse.password; // Ensure password is not returned

    return res.status(200).json(userResponse);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// DELETE: Admin only
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID format" });

  const transaction = await sequelize.transaction();
  
  try {
    const deleted = await User.destroy({ 
      where: { userId: id },
      transaction 
    });

    if (!deleted) {
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    
    await transaction.commit();
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// --- Add this endpoint ---
router.post("/:id/upload-profile-image", authenticate, upload.single("profileImage"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  // Optionally, update the user's profileImage field here
  // await User.update({ profileImage: req.file.filename }, { where: { userId: req.params.id } });
  res.json({ filename: req.file.filename });
});

module.exports = router;