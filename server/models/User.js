const mongoose = require('mongoose'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();

app.use(express.json());

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: { type: [String] }, // Array of strings
  birthdate: { type: Date },
  department: { 
    type: String, 
    enum: ['ICT', 'HR', 'Finance', 'Marketing', 'Operations'], // Restrict to predefined values
    default: "" 
  },
  role: {
    type: String,
    enum: ["User", "Admin"],
    required: true, // Ensure the role is always required
    default: "User" // Default role is "User"
  },
  isActive: { type: Boolean, default: true } // Added isActive field
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { id: this._id, email: this.email, role: this.role.toLowerCase() },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return token;
};


userSchema.methods.checkActiveStatus = function () {
  return this.isActive;
};

const User = mongoose.model('User', userSchema);

app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profileImage with Base64 strings
    if (req.body.profileImage) {
      user.profileImage = req.body.profileImage; // Expecting an array of Base64 strings
    }

    // Update other fields
    Object.assign(user, req.body);

    await user.save();
    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = User;