const express = require('express');
const Fox = require('../models/Fox');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Leaderboard page (registered users only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const topFoxes = await Fox.find({ registeredVotes: { $gt: 0 } })
      .sort({ registeredVotes: -1 })
      .limit(20);

    res.render('leaderboard', { foxes: topFoxes, user: req.user });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.render('leaderboard', { foxes: [], user: req.user });
  }
});

// API endpoint for leaderboard data
router.get('/api', async (req, res) => {
  try {
    const topFoxes = await Fox.find({ registeredVotes: { $gt: 0 } })
      .sort({ registeredVotes: -1 })
      .limit(20)
      .select('foxNumber imageUrl registeredVotes totalVotes');

    res.json(topFoxes);
  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
