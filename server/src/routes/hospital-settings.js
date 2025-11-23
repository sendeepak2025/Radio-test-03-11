const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/authMiddleware')
const { getCurrent, upsert, uploadMiddleware, uploadLogo } = require('../controllers/hospitalSettingsController')

router.use(authenticate)

router.get('/me', getCurrent)
router.put('/', express.json(), upsert)
router.post('/logo', uploadMiddleware(), uploadLogo)

module.exports = router