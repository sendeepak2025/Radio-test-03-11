/**
 * Snapshot Upload Controller
 * Handles uploading of viewer snapshots/screenshots
 */

const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configure storage for snapshots
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/snapshots');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use original filename or generate one
    const filename = file.originalname || `snapshot-${Date.now()}.png`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Upload snapshot
 * POST /upload/
 */
const uploadSnapshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8001}`;
    const fileUrl = `${backendUrl}/uploads/snapshots/${req.file.filename}`;

    console.log('✅ Snapshot uploaded:', req.file.filename);

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('❌ Snapshot upload error:', error);
    res.status(500).json({ error: 'Failed to upload snapshot' });
  }
};

module.exports = {
  uploadMiddleware: () => upload.single('file'),
  uploadSnapshot
};
