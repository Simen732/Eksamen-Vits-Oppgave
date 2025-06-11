const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Fox = require('../models/Fox');
const { authenticateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Profile page
router.get('/', authenticateToken, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Get user's voting statistics
    const userVotes = await Fox.aggregate([
      {
        $match: {
          'votes.userId': req.user._id
        }
      },
      {
        $addFields: {
          userVoteCount: {
            $size: {
              $filter: {
                input: '$votes',
                cond: { $eq: ['$$this.userId', req.user._id] }
              }
            }
          }
        }
      },
      {
        $match: {
          userVoteCount: { $gt: 0 }
        }
      },
      {
        $sort: { userVoteCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          foxNumber: 1,
          imageUrl: 1,
          totalVotes: 1,
          userVoteCount: 1
        }
      }
    ]);

    // Get all foxes for favorite selection
    const allFoxes = await Fox.find({ totalVotes: { $gt: 0 } })
      .sort({ totalVotes: -1 })
      .limit(50)
      .select('foxNumber imageUrl totalVotes');

    res.render('profile/index', {
      user,
      userVotes,
      allFoxes,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.render('profile/index', {
      user: req.user,
      userVotes: [],
      allFoxes: [],
      error: 'Kunne ikke laste profil',
      success: null
    });
  }
});

// Update profile picture
router.post('/upload-picture', authenticateToken, requireAuth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/profile?error=Ingen fil valgt');
    }

    // Delete old profile picture if it exists
    const user = await User.findById(req.user._id);
    if (user.profilePicture && user.profilePicture !== '/images/placeholder.png') {
      const oldPicturePath = path.join(__dirname, '../public', user.profilePicture);
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }

    // Update user with new profile picture
    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, {
      profilePicture: profilePicturePath
    });

    res.redirect('/profile?success=Profilbilde oppdatert!');
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.redirect('/profile?error=Kunne ikke laste opp profilbilde');
  }
});

// Change password
router.post('/change-password', [
  authenticateToken,
  requireAuth,
  body('currentPassword').notEmpty().withMessage('Nåværende passord er påkrevd'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nytt passord må være minst 6 tegn'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passordene stemmer ikke overens');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect(`/profile?error=${errors.array()[0].msg}`);
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.redirect('/profile?error=Nåværende passord er feil');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.redirect('/profile?success=Passord endret!');
  } catch (error) {
    console.error('Password change error:', error);
    res.redirect('/profile?error=Kunne ikke endre passord');
  }
});

// Set favorite fox
router.post('/set-favorite-fox', authenticateToken, requireAuth, async (req, res) => {
  const { foxNumber } = req.body;

  try {
    const fox = await Fox.findOne({ foxNumber: parseInt(foxNumber) });
    if (!fox) {
      return res.redirect('/profile?error=Rev ikke funnet');
    }

    await User.findByIdAndUpdate(req.user._id, {
      favoriteFox: {
        foxNumber: fox.foxNumber,
        imageUrl: fox.imageUrl
      }
    });

    res.redirect('/profile?success=Favorittrev satt!');
  } catch (error) {
    console.error('Set favorite fox error:', error);
    res.redirect('/profile?error=Kunne ikke sette favorittrev');
  }
});

// Update bio
router.post('/update-bio', [
  authenticateToken,
  requireAuth,
  body('bio').isLength({ max: 500 }).withMessage('Bio kan ikke være lengre enn 500 tegn')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect(`/profile?error=${errors.array()[0].msg}`);
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      bio: req.body.bio || ''
    });

    res.redirect('/profile?success=Bio oppdatert!');
  } catch (error) {
    console.error('Update bio error:', error);
    res.redirect('/profile?error=Kunne ikke oppdatere bio');
  }
});

module.exports = router;
