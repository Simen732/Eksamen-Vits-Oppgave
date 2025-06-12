const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Joke = require('../models/Joke');
const { authenticateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads with better error handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/profiles');
    
    // Create directory hierarchy step by step with proper permissions
    try {
      const publicDir = path.join(__dirname, '../public');
      const uploadsBaseDir = path.join(__dirname, '../public/uploads');
      
      // Create each directory level if it doesn't exist
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true, mode: 0o755 });
      }
      if (!fs.existsSync(uploadsBaseDir)) {
        fs.mkdirSync(uploadsBaseDir, { recursive: true, mode: 0o755 });
      }
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      }
      
      // Test write permissions by creating a temporary file
      const testFile = path.join(uploadDir, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      cb(null, uploadDir);
    } catch (error) {
      console.error('Upload directory error:', error);
      // Try alternative approach - create with different permissions
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.accessSync(uploadDir, fs.constants.W_OK);
        cb(null, uploadDir);
      } catch (fallbackError) {
        console.error('Fallback directory creation failed:', fallbackError);
        cb(new Error(`Upload directory is not accessible: ${error.message}. Please check that the application has write permissions to the uploads folder.`));
      }
    }
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
    
    // If user has a favorite joke, ensure it has the latest data
    if (user.favoriteJoke && user.favoriteJoke.jokeId) {
      const currentJoke = await Joke.findOne({ jokeId: user.favoriteJoke.jokeId });
      if (currentJoke) {
        // Update favorite joke with current data
        user.favoriteJoke.averageRating = currentJoke.averageRating;
        user.favoriteJoke.category = currentJoke.category;
      }
    }

    // Get user's rating statistics
    const userRatings = await Joke.aggregate([
      {
        $match: {
          'ratings.userId': req.user._id
        }
      },
      {
        $addFields: {
          userRating: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: '$ratings',
                      cond: { $eq: ['$$this.userId', req.user._id] }
                    }
                  },
                  as: 'rating',
                  in: '$$rating.rating'
                }
              },
              0
            ]
          }
        }
      },
      {
        $match: {
          userRating: { $exists: true }
        }
      },
      {
        $sort: { userRating: -1, averageRating: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          jokeId: 1,
          text: 1,
          category: 1,
          averageRating: 1,
          totalRatings: 1,
          userRating: 1
        }
      }
    ]);

    // Get all jokes for favorite selection (top rated jokes)
    const allJokes = await Joke.find({ totalRatings: { $gt: 0 } })
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(50)
      .select('jokeId text category averageRating totalRatings');

    res.render('profile/index', {
      user,
      userRatings,
      allJokes,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.render('profile/index', {
      user: req.user,
      userRatings: [],
      allJokes: [],
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
    if (user.profilePicture && 
        user.profilePicture !== '/images/placeholder.png' && 
        user.profilePicture !== '' &&
        !user.profilePicture.includes('placeholder')) {
      const oldPicturePath = path.join(__dirname, '../public', user.profilePicture);
      try {
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
      } catch (deleteError) {
        console.warn('Could not delete old profile picture:', deleteError.message);
        // Continue anyway - not critical
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
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Could not clean up uploaded file:', cleanupError.message);
      }
    }
    
    if (error.code === 'EACCES') {
      res.redirect('/profile?error=Ingen tilgang til å lagre filer. Kontakt administrator.');
    } else if (error.message.includes('Upload directory')) {
      res.redirect('/profile?error=Opplastingsmappe er ikke tilgjengelig. Kontakt administrator.');
    } else {
      res.redirect('/profile?error=Kunne ikke laste opp profilbilde');
    }
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

// Set favorite joke
router.post('/set-favorite-joke', authenticateToken, requireAuth, async (req, res) => {
  const { jokeId } = req.body;

  try {
    console.log('Setting favorite joke - received jokeId:', jokeId, 'type:', typeof jokeId);
    
    if (!jokeId || jokeId === '') {
      return res.redirect('/profile?error=Ingen vits valgt');
    }

    // Handle both string and numeric joke IDs
    let joke = await Joke.findOne({ jokeId: jokeId });
    
    console.log('Found joke:', joke ? `${joke.jokeId}: ${joke.text.substring(0, 50)}...` : 'null');

    if (!joke) {
      // Debug: Get all jokes to see what's available
      const allJokes = await Joke.find({}).select('jokeId text').limit(5);
      console.log('Available jokes for debugging:', allJokes.map(j => ({ id: j.jokeId, type: typeof j.jokeId })));
      return res.redirect('/profile?error=Vits ikke funnet');
    }

    const updateData = {
      favoriteJoke: {
        jokeId: joke.jokeId, // Keep original type
        text: joke.text,
        category: joke.category || 'Generell',
        averageRating: joke.averageRating || 0
      }
    };

    console.log('Updating user favorite joke with:', updateData);

    await User.findByIdAndUpdate(req.user._id, updateData);

    console.log('Favorite joke updated successfully');
    res.redirect('/profile?success=Favorittvits satt!');
  } catch (error) {
    console.error('Set favorite joke error:', error);
    res.redirect('/profile?error=Kunne ikke sette favorittvits');
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
