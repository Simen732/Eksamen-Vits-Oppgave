// Add this at the very top, before other requires
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const authRoutes = require('./routes/auth');
const voteRoutes = require('./routes/vote');
const leaderboardRoutes = require('./routes/leaderboard');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
      imgSrc: ["'self'", "https://randomfox.ca", "https:", "data:", "blob:"], // More specific and add blob:
      connectSrc: ["'self'", "ws:", "wss:", "https://randomfox.ca"], // Add randomfox.ca to connect sources
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // limit voting to 10 per minute
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // This points to views/layout.ejs

// Database connection - use environment variable
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foxvoting', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/auth', authRoutes);
app.use('/vote', voteLimiter, voteRoutes);
app.use('/leaderboard', leaderboardRoutes);

// Main page
app.get('/', authenticateToken, async (req, res) => {
  const Fox = require('./models/Fox');
  
  try {
    // Get trending foxes (most votes today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const trendingFoxes = await Fox.find({
      'votes.date': { $gte: today }
    }).sort({ totalVotes: -1 }).limit(5);

    res.render('index', { 
      user: req.user,
      trendingFoxes
    });
  } catch (error) {
    console.error('Error loading main page:', error);
    res.render('index', { 
      user: req.user,
      trendingFoxes: []
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
