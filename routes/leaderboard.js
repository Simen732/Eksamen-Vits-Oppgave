const express = require('express');
const Joke = require('../models/Joke');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Leaderboard page
router.get('/', authenticateToken, async (req, res) => {
  try {
    const topJokes = await Joke.find({ totalRatings: { $gt: 0 } }) // Changed from registeredRatings to totalRatings
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(50);

    console.log('Leaderboard: Found', topJokes.length, 'jokes with ratings'); // Add logging
    res.render('leaderboard', { jokes: topJokes, user: req.user });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.render('leaderboard', { jokes: [], user: req.user });
  }
});

// API endpoint for leaderboard data
router.get('/api', async (req, res) => {
  try {
    const topJokes = await Joke.find({ totalRatings: { $gt: 0 } }) // Changed from registeredRatings to totalRatings
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(50)
      .select('jokeId text category averageRating totalRatings registeredRatings');

    res.json(topJokes);
  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
