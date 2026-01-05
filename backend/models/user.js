const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'User',
    trim: true,
  },
  username: {
    type: String,
    trim: true,
    unique: false, // set to true if you want usernames to be unique
    sparse: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String, // hashed password (only for email signups)
  },
  firebaseUID: {
    type: String, // only for Google-authenticated users
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Optional: Index to speed up lookups
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);