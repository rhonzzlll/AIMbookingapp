const mongoose = require('mongoose'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: { type: String, default: "" },
  address: { type: String, default: "" },
  birthdate: { type: Date },
  department: { type: String, default: "" },
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

// Middleware to check if user is active
userSchema.methods.checkActiveStatus = function () {
  return this.isActive;
};

const User = mongoose.model('User', userSchema);

module.exports = User;