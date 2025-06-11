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
const profileRoutes = require('./routes/profile');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Security middleware - Modified for HTTP-only
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://randomfox.ca", "http:", "https:", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:", "https://randomfox.ca"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: false, // Disable HTTPS Strict Transport Security
  httpsOnly: false, // Disable HTTPS-only mode
  forceHTTPS: false // Explicitly disable HTTPS forcing
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
app.use(express.static(path.join(__dirname, 'public')));

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
app.use('/profile', profileRoutes);

// Main page
app.get('/', authenticateToken, async (req, res) => {
  const Fox = require('./models/Fox');
  
  try {
    // Get trending foxes (most votes today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const trendingFoxes = await Fox.aggregate([
      {
        $match: {
          totalVotes: { $gt: 0 }
        }
      },
      {
        $addFields: {
          todayVotes: {
            $size: {
              $filter: {
                input: "$votes",
                cond: { $gte: ["$$this.date", today] }
              }
            }
          }
        }
      },
      {
        $sort: { todayVotes: -1, totalVotes: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          foxNumber: 1,
          imageUrl: 1,
          totalVotes: 1,
          todayVotes: 1
        }
      }
    ]);

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
