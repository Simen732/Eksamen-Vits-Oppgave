const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePicture: {
    type: String,
    default: '/images/placeholder.png'
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  favoriteJoke: {
    jokeId: {
      type: mongoose.Schema.Types.Mixed, // Allow both Number and String
      default: null
    },
    text: {
      type: String,
      default: null
    },
    category: {
      type: String,
      default: null
    },
    averageRating: {
      type: Number,
      default: null
    }
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  averageRatingGiven: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await argon2.hash(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
