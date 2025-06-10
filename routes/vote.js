const express = require('express');
const axios = require('axios');
const Fox = require('../models/Fox');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get random fox images
router.get('/random-foxes', async (req, res) => {
  try {
    console.log('Fetching random foxes...');
    
    // Get two random fox images
    const fox1Response = await axios.get('https://randomfox.ca/floof/');
    const fox2Response = await axios.get('https://randomfox.ca/floof/');
    
    let fox1Url = fox1Response.data.image;
    let fox2Url = fox2Response.data.image;

    console.log('Fox URLs:', { fox1Url, fox2Url });

    // Ensure they're different
    while (fox1Url === fox2Url) {
      const newResponse = await axios.get('https://randomfox.ca/floof/');
      fox2Url = newResponse.data.image;
    }

    // Extract fox numbers from URLs
    const fox1Number = parseInt(fox1Url.split('/').pop().split('.')[0]);
    const fox2Number = parseInt(fox2Url.split('/').pop().split('.')[0]);

    console.log('Fox numbers:', { fox1Number, fox2Number });

    // Ensure foxes exist in database
    await Fox.findOneAndUpdate(
      { foxNumber: fox1Number },
      { imageUrl: fox1Url, foxNumber: fox1Number },
      { upsert: true, new: true }
    );

    await Fox.findOneAndUpdate(
      { foxNumber: fox2Number },
      { imageUrl: fox2Url, foxNumber: fox2Number },
      { upsert: true, new: true }
    );

    const responseData = {
      fox1: { url: fox1Url, number: fox1Number },
      fox2: { url: fox2Url, number: fox2Number }
    };

    console.log('Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching foxes:', error);
    res.status(500).json({ error: 'Failed to fetch fox images' });
  }
});

// Vote for a fox
router.post('/vote/:foxNumber', authenticateToken, async (req, res) => {
  const foxNumber = parseInt(req.params.foxNumber);
  
  console.log('Vote request for fox:', foxNumber);
  console.log('User authenticated:', !!req.user);

  if (isNaN(foxNumber)) {
    return res.status(400).json({ error: 'Invalid fox number' });
  }

  try {
    let fox = await Fox.findOne({ foxNumber });
    
    if (!fox) {
      console.log('Fox not found, creating new fox entry');
      // Create fox if it doesn't exist
      fox = new Fox({
        foxNumber: foxNumber,
        imageUrl: `https://randomfox.ca/images/${foxNumber}.jpg`, // Default URL pattern
        votes: [],
        totalVotes: 0,
        registeredVotes: 0
      });
    }

    // Add vote
    const vote = {
      userId: req.user ? req.user._id : null,
      isRegistered: !!req.user,
      date: new Date()
    };

    fox.votes.push(vote);
    fox.totalVotes += 1;
    
    if (req.user) {
      fox.registeredVotes += 1;
      // Update user's total votes
      await User.findByIdAndUpdate(req.user._id, { $inc: { totalVotes: 1 } });
      console.log('Updated registered user vote count');
    } else {
      console.log('Anonymous vote recorded');
    }

    await fox.save();
    console.log('Vote saved successfully');

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('voteUpdate', {
      foxNumber: fox.foxNumber,
      totalVotes: fox.totalVotes,
      registeredVotes: fox.registeredVotes
    });

    res.json({ 
      success: true, 
      message: `Stemme registrert for Rev ${foxNumber}!`,
      totalVotes: fox.totalVotes 
    });
  } catch (error) {
    console.error('Voting error:', error);
    res.status(500).json({ error: 'Kunne ikke registrere stemme' });
  }
});

module.exports = router;
