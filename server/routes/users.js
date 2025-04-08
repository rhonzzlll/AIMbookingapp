const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authenticate, authorizeAdmin } = require("../routes/auth"); // Import directly from auth routes

// GET route to fetch all users - adding authentication
router.get("/", authenticate, async (req, res) => {
  try {
    // Use select to exclude password from results
    const users = await User.find().select("-password");
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// GET route to fetch a user by ID - adding authentication
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    const user = await User.findById(id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// POST route to handle user registration (Admin-only)
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, isActive = true } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "Please provide all required fields, including role." });
    }

    // Validate role with case insensitivity
    const normalizedRole = role.toLowerCase();
    if (!["admin", "user"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role. Role must be 'Admin' or 'User'." });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user with proper case for role
    const user = new User({
      firstName,
      lastName,
      email,
      password, // Will be hashed by pre-save hook in User model
      department,
      role: normalizedRole === "admin" ? "Admin" : "User", // Match the enum case
      isActive
    });

    await user.save();

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
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

// PUT route to update user profile - adding authentication
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password, department, profileImage, address, birthdate, role, isActive } = req.body;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    // Find user first to check if exists
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if the authenticated user is updating their own profile or is an admin
    if (req.user._id.toString() !== id && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. You can only update your own profile." });
    }
    
    // Update user fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (department) user.department = department;
    if (address) user.address = address;
    if (birthdate) user.birthdate = birthdate;
    
    // Only allow admins to change roles and active status
    if (req.user.role === "Admin") {
      if (role) {
        // Normalize role and validate
        const normalizedRole = role.toLowerCase();
        if (!["admin", "user"].includes(normalizedRole)) {
          return res.status(400).json({ message: "Invalid role. Role must be 'Admin' or 'User'." });
        }
        user.role = normalizedRole === "admin" ? "Admin" : "User"; // Match the enum case
      }
      
      // Set isActive if provided (only admins can change this)
      if (isActive !== undefined) {
        user.isActive = isActive;
      }
    }
    
    // Handle password separately
    if (password) {
      // No need to hash here as the pre-save hook will handle it
      user.password = password;
    }
    
    // Handle profile image
    if (profileImage) {
      user.profileImage = profileImage;
    }
    
    // Save the updated user
    const updatedUser = await user.save();
    
    // Return user without password
    return res.status(200).json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      address: updatedUser.address,
      birthdate: updatedUser.birthdate,
      profileImage: updatedUser.profileImage,
      isActive: updatedUser.isActive
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

// DELETE route to remove a user - adding authentication and admin authorization
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Something went wrong! Please try again." });
  }
});

module.exports = router;