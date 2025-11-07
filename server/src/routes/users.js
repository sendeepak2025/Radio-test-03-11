/**
 * User Profile and Settings Routes
 * Manage user profile, signature, and preferences
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for signature uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.userId || req.user._id || req.user.id;
    const uniqueName = `signature-${userId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed for signatures'));
  }
});

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      profile: {
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.username,
        role: user.role || user.roles?.[0],
        hospitalId: user.hospitalId,
        hospitalName: user.hospitalName || 'Unknown Hospital',
        licenseNumber: user.licenseNumber,
        specialty: user.specialty,
        signatureText: user.signatureText,
        signatureImageUrl: user.signatureImageUrl
      }
    });

  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const { fullName, email, licenseNumber, specialty, signatureText } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (specialty !== undefined) user.specialty = specialty;
    if (signatureText !== undefined) user.signatureText = signatureText;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role || user.roles?.[0],
        hospitalId: user.hospitalId,
        hospitalName: user.hospitalName,
        licenseNumber: user.licenseNumber,
        specialty: user.specialty,
        signatureText: user.signatureText,
        signatureImageUrl: user.signatureImageUrl
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users/signature
 * Upload signature image
 */
router.post('/signature', upload.single('signature'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No signature file uploaded'
      });
    }

    const userId = req.user.userId || req.user._id || req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete old signature file if exists
    if (user.signatureImagePath) {
      try {
        await fs.unlink(user.signatureImagePath);
      } catch (err) {
        console.warn('Failed to delete old signature:', err.message);
      }
    }

    // Store signature path and URL
    user.signatureImagePath = req.file.path;
    user.signatureImageUrl = `/api/users/signature/image/${req.file.filename}`;
    
    await user.save();

    res.json({
      success: true,
      message: 'Signature uploaded successfully',
      signatureUrl: user.signatureImageUrl
    });

  } catch (error) {
    console.error('❌ Error uploading signature:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/signature
 * Delete signature image
 */
router.delete('/signature', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete signature file if exists
    if (user.signatureImagePath) {
      try {
        await fs.unlink(user.signatureImagePath);
      } catch (err) {
        console.warn('Failed to delete signature file:', err.message);
      }
    }

    // Clear signature fields
    user.signatureImagePath = undefined;
    user.signatureImageUrl = undefined;
    
    await user.save();

    res.json({
      success: true,
      message: 'Signature deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting signature:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/users/signature/image/:filename
 * Serve signature image
 */
router.get('/signature/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/signatures', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Signature image not found'
      });
    }

    res.sendFile(filePath);

  } catch (error) {
    console.error('❌ Error serving signature:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
