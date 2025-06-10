const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

const foxSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
    unique: true
  },
  foxNumber: {
    type: Number,
    required: true,
    unique: true
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  registeredVotes: {
    type: Number,
    default: 0
  },
  votes: [voteSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better performance
foxSchema.index({ totalVotes: -1 });
foxSchema.index({ registeredVotes: -1 });
foxSchema.index({ 'votes.date': -1 });

module.exports = mongoose.model('Fox', foxSchema);
