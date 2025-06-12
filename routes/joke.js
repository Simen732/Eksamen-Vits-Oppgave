const express = require('express');
const axios = require('axios');
const Joke = require('../models/Joke');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get random joke
router.get('/random', async (req, res) => {
  try {
    console.log('Random joke endpoint hit');
    
    let jokeData = null;
    
    // Try official joke API first
    try {
      console.log('Trying official joke API...');
      const response = await axios.get('https://official-joke-api.appspot.com/random_joke', {
        timeout: 5000 // 5 second timeout
      });
      console.log('API response:', response.data);
      
      jokeData = {
        text: `${response.data.setup} ${response.data.punchline}`,
        category: response.data.type || 'general',
        id: `official_${response.data.id}`
      };
      console.log('Created joke data from API:', jokeData);
    } catch (apiError) {
      console.log('Official joke API failed:', apiError.message);
    }
    
    // Fallback jokes if API fails
    if (!jokeData) {
      console.log('Using fallback jokes...');
      const fallbackJokes = [
        { text: "Why don't scientists trust atoms? Because they make up everything!", category: "science", id: "fallback_1" },
        { text: "Why did the scarecrow win an award? He was outstanding in his field!", category: "general", id: "fallback_2" },
        { text: "Why don't eggs tell jokes? They'd crack each other up!", category: "general", id: "fallback_3" },
        { text: "What do you call a fake noodle? An impasta!", category: "food", id: "fallback_4" },
        { text: "Why did the math book look so sad? Because it was full of problems!", category: "school", id: "fallback_5" }
      ];
      
      jokeData = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
      console.log('Selected fallback joke:', jokeData);
    }

    // Ensure joke exists in database
    let joke = await Joke.findOne({ jokeId: jokeData.id });
    if (!joke) {
      console.log('Creating new joke in database...');
      joke = new Joke({
        text: jokeData.text,
        category: jokeData.category,
        jokeId: jokeData.id,
        ratings: [],
        totalRatings: 0,
        averageRating: 0,
        registeredRatings: 0
      });
      await joke.save();
      console.log('Joke saved to database');
    }

    const responseData = {
      id: joke.jokeId,
      text: joke.text,
      category: joke.category,
      averageRating: joke.averageRating,
      totalRatings: joke.totalRatings
    };

    console.log('Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error in /joke/random:', error);
    res.status(500).json({ error: 'Failed to fetch joke' });
  }
});

// Rate a joke
router.post('/rate/:jokeId', authenticateToken, async (req, res) => {
  const jokeId = req.params.jokeId;
  const { rating } = req.body;
  
  console.log('Rating request for joke:', jokeId, 'Rating:', rating);
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    let joke = await Joke.findOne({ jokeId });
    
    if (!joke) {
      return res.status(404).json({ error: 'Joke not found' });
    }

    // Check if user already rated this joke
    if (req.user) {
      const existingRating = joke.ratings.find(r => r.userId && r.userId.toString() === req.user._id.toString());
      if (existingRating) {
        return res.status(400).json({ error: 'You have already rated this joke' });
      }
    }

    // Add rating
    const newRating = {
      userId: req.user ? req.user._id : null,
      rating: parseInt(rating),
      isRegistered: !!req.user,
      date: new Date()
    };

    joke.ratings.push(newRating);
    joke.totalRatings += 1;
    
    if (req.user) {
      joke.registeredRatings += 1;
      // Update user's total ratings
      await User.findByIdAndUpdate(req.user._id, { $inc: { totalRatings: 1 } });
    }
    
    // Calculate new average
    joke.calculateAverageRating();
    await joke.save();

    console.log('Rating saved successfully');

    // Emit real-time update
    const io = req.app.get('io');
    const updateData = {
      jokeId: joke.jokeId,
      averageRating: joke.averageRating,
      totalRatings: joke.totalRatings,
      registeredRatings: joke.registeredRatings,
      timestamp: new Date()
    };
    
    io.emit('ratingUpdate', updateData);
    io.emit('jokeRatingUpdate', updateData); // Add this line for leaderboard compatibility
    
    console.log('Emitted rating update:', updateData);

    res.json({ 
      success: true, 
      message: `Takk for din vurdering!`,
      averageRating: joke.averageRating,
      totalRatings: joke.totalRatings,
      registeredRatings: joke.registeredRatings
    });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Kunne ikke registrere vurdering' });
  }
});

// Get top rated jokes
router.get('/top-rated', async (req, res) => {
  try {
    const topJokes = await Joke.find({ totalRatings: { $gt: 0 } })
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(10)
      .select('jokeId text category averageRating totalRatings');

    res.json(topJokes);
  } catch (error) {
    console.error('Error fetching top rated jokes:', error);
    res.status(500).json({ error: 'Failed to fetch top rated jokes' });
  }
});

module.exports = router;
