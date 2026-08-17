const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { verifyToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

// Public route to view school profile
router.get('/', schoolController.getSchoolInfo);

// Super Admin restricted route to update school profile and branding
router.put(
  '/', 
  verifyToken, 
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'hero_image', maxCount: 1 }
  ]), 
  schoolController.updateSchoolInfo
);

module.exports = router;
