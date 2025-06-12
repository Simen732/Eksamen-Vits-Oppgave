const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  date: {
    type: Date,
    default: Date.now
  },
  isRegistered: {
    type: Boolean,
    default: false
  }
});

const jokeSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  jokeId: {
    type: String,
    required: true,
    unique: true
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  registeredRatings: {
    type: Number,
    default: 0
  },
  ratings: [ratingSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better performance
jokeSchema.index({ averageRating: -1 });
jokeSchema.index({ totalRatings: -1 });
jokeSchema.index({ 'ratings.date': -1 });

// Method to calculate average rating
jokeSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    return 0;
  }
  
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10; // Round to 1 decimal
  return this.averageRating;
};

module.exports = mongoose.model('Joke', jokeSchema);
