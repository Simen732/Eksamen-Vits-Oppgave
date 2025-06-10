const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Registration page
router.get('/register', authenticateToken, (req, res) => {
  res.render('auth/register', { error: null, user: req.user });
});

// Login page
router.get('/login', authenticateToken, (req, res) => {
  res.render('auth/login', { error: null, user: req.user });
});

// Register
router.post('/register', [
  body('username').isLength({ min: 3, max: 20 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', { 
      error: 'Invalid input data',
      user: null
    });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.render('auth/register', { 
        error: 'User already exists',
        user: null
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', { 
      error: 'Registration failed',
      user: null
    });
  }
});

// Login
router.post('/login', [
  body('username').trim().escape(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', { 
      error: 'Invalid input data',
      user: null
    });
  }

  const { username, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ 
      $or: [{ email: username }, { username }] 
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.render('auth/login', { 
        error: 'Invalid credentials',
        user: null
      });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { 
      error: 'Login failed',
      user: null
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;
