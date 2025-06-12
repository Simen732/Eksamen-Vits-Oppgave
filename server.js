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
const fs = require('fs');

const authRoutes = require('./routes/auth');
const jokeRoutes = require('./routes/joke');
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
      mediaSrc: ["'self'"],
      upgradeInsecureRequests: null // Explicitly disable upgrade insecure requests
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: false,
  httpsOnly: false,
  forceHTTPS: false,
  upgradeInsecureRequests: false // Explicitly disable
}));

// Force HTTP middleware - prevents HTTPS redirects
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') === 'https') {
    res.redirect(`http://${req.get('Host')}${req.url}`);
  } else {
    next();
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000 * 20, // 300 minutes (5 hours)
  max: 100 * 25 // limit each IP to 2500 requests per 5 hours
});
app.use(limiter);

const voteLimiter = rateLimit({
  windowMs: 60 * 1000 * 30, // 30 minutes
  max: 10 * 25 // limit voting to 250 per 30 minutes
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public/uploads/profiles');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
    console.log('Created uploads directory');
  }
} catch (error) {
  console.warn('Could not create uploads directory:', error.message);
}

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
  
  socket.on('error', (error) => {
    console.log('Socket error:', error);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/auth', authRoutes);
app.use('/joke', jokeRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/profile', profileRoutes);

// FAQ page
app.get('/faq', authenticateToken, (req, res) => {
  res.render('faq', { user: req.user });
});

// Main page
app.get('/', authenticateToken, async (req, res) => {
  console.log('Main page accessed, user:', req.user ? req.user.username : 'anonymous');
  const Joke = require('./models/Joke');
  
  try {
    // Get top rated jokes
    const topJokes = await Joke.find({ totalRatings: { $gt: 0 } })
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(5)
      .select('jokeId text category averageRating totalRatings');

    console.log('Found top jokes:', topJokes.length);
    res.render('index', { 
      user: req.user,
      topJokes
    });
  } catch (error) {
    console.error('Error loading main page:', error);
    res.render('index', { 
      user: req.user,
      topJokes: []
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready on port ${PORT}`);
});
