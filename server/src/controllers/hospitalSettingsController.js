const path = require('path')
const fs = require('fs').promises
const multer = require('multer')
const Hospital = require('../models/User')
const User = require('../models/User')
const HospitalSettings = require('../models/HospitalSettings')

const getBackendUrl = () => {
  const port = process.env.PORT || 8001
  const url = process.env.BACKEND_URL || `http://localhost:${port}`
  return url
}


async function getHospitalIdFromDB(req) {
  const userId = req.user?.sub || req.user?._id || req.user?.id;
  if (!userId) return null;

  const user = await User.findById(userId).lean();
  if (!user) return null;

  return user.hospitalId || user._id.toString();
}


// GET /api/hospital-settings/me
async function getCurrent(req, res) {
  try {
    const userId = req.user.sub || req.user._id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const hospitalId = user.hospitalId;

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "Hospital ID missing" });
    }

    // Try to load hospital settings
    let settings = await HospitalSettings.findOne({ hospitalId }).lean();

    // If no settings exist → create default
    if (!settings) {
      settings = await HospitalSettings.create({
        hospitalId,
        name: user.hospitalName || user.fullName || user.username,
        contactEmail: user.email,
        contactPhone: user.contactPhone || "",
        address: user.address || {},
        logoUrl: "",
        settings: {
          requireMFA: false,
          autoBackup: true,
          dataRetentionDays: 2555,
          allowDataSharing: false,
          allowedIPs: []
        }
      });
      settings = settings.toObject();
    }

    return res.json({
      success: true,
      data: {
        hospital: {
          hospitalId,
          hospitalUsername: user.username,   // <<-- ADDED
          name: settings.name,
          contactEmail: settings.contactEmail,
          contactPhone: settings.contactPhone,
          address: settings.address,
          logoUrl: settings.logoUrl
        },
        settings: settings.settings || {}
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load hospital settings" });
  }
}






async function upsert(req, res) {
  try {
    const hospitalId = await getHospitalIdFromDB(req);

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "Hospital ID required" });
    }

    const user = await User.findOne({ hospitalId });

    if (!user) {
      return res.status(404).json({ success: false, message: "Hospital user not found" });
    }

    const { name, contactEmail, contactPhone, address, settings } = req.body || {};

    if (name) user.hospitalName = name;
    if (contactEmail) user.email = contactEmail;
    if (contactPhone) user.contactPhone = contactPhone;
    if (address) user.address = address;

    await user.save();

    let settingsDoc = await HospitalSettings.findOne({ hospitalId });

    if (!settingsDoc) {
      settingsDoc = await HospitalSettings.create({
        hospitalId,
        name,
        contactEmail,
        contactPhone,
        address,
        logoUrl: user.logoUrl,
        settings: settings || {}
      });
    } else {
      settingsDoc.name = name;
      settingsDoc.contactEmail = contactEmail;
      settingsDoc.contactPhone = contactPhone;
      settingsDoc.address = address;

      if (settings && typeof settings === 'object') {
        settingsDoc.settings = { ...settingsDoc.settings, ...settings };
      }

      await settingsDoc.save();
    }

    return res.json({
      success: true,
      data: {
        hospitalId,
        settingsId: settingsDoc._id,
        logoUrl: settingsDoc.logoUrl
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to update settings" });
  }
}


const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // 1) ALWAYS use DB user — never JWT
      const userId = req.user?.sub || req.user?._id || req.user?.id;
      const user = await User.findById(userId).lean();

      // 2) Get correct hospitalId from DB
      let hospitalId = user?.hospitalId || user?._id?.toString() || "unknown";

      console.log("MULTER → Correct Hospital ID:", hospitalId);

      // 3) Build directory path
      const uploadDir = path.join(__dirname, '../../uploads/hospital-logos', hospitalId);
      await fs.mkdir(uploadDir, { recursive: true });

      cb(null, uploadDir);
    } catch (err) {
      console.error("Multer destination ERROR:", err);
      cb(err, null);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.png';
    const filename = `logo-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  }
})

async function uploadLogo(req, res) {
  try {
    console.log("===== UPLOAD LOGO START =====");

    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log("File received:", req.file.filename);

    // --- ALWAYS USE DATABASE USER, NOT JWT ---
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    if (!userId) {
      console.log("User ID missing in token");
      return res.status(400).json({ success: false, message: 'Invalid User' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      console.log("User not found in DB");
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // --- FIX: ALWAYS prefer user.hospitalId from DB ---
    let hospitalId = user.hospitalId;

    // If user.hospitalId empty → fallback to user._id
    if (!hospitalId || hospitalId.trim() === "") {
      hospitalId = user._id.toString(); // fallback
    }

    console.log("Correct Hospital ID:", hospitalId);

    // Build logo path
    const backendUrl = getBackendUrl();
    const relativePath = `/uploads/hospital-logos/${hospitalId}/${req.file.filename}`;
    const fileUrl = `${backendUrl}${relativePath}`;

    console.log("Generated Logo URL:", fileUrl);

    // ---- SETTINGS UPDATE OR CREATE ----
    let settingsDoc = await HospitalSettings.findOne({ hospitalId });

    if (!settingsDoc) {
      console.log("Settings not found → Creating new settings");

      settingsDoc = await HospitalSettings.create({
        hospitalId,
        name: user.hospitalName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "My Hospital",
        contactEmail: user.email || "not-set@example.com",
        contactPhone: "",
        address: "",
        logoUrl: fileUrl,
        theme: "light",
        reportHeader: "",
        reportFooter: "",
        signatureRequired: false,
        autoArchive: false
      });

      console.log("Settings created:", settingsDoc._id);
    } else {
      console.log("Settings found → Updating logoUrl");
      settingsDoc.logoUrl = fileUrl;
      await settingsDoc.save();
      console.log("Settings updated");
    }

    console.log("===== UPLOAD LOGO FINISHED SUCCESSFULLY =====");

    return res.json({
      success: true,
      url: fileUrl,
      settingsId: settingsDoc._id
    });

  } catch (error) {
    console.log("===== UPLOAD LOGO ERROR =====");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload logo",
      error: error.message
    });
  }
}



module.exports = {
  getCurrent,
  upsert,
  uploadMiddleware: () => upload.single('file'),
  uploadLogo
}