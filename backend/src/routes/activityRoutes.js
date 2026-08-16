const express = require('express');
const router = express.Router();
const activitiesController = require('../controllers/activitiesController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

router.get('/', activitiesController.getActivities);
router.get('/:id', activitiesController.getActivityById);

router.post(
  '/', 
  verifyToken, 
  requireTeacherOrAdmin, 
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 10 }
  ]), 
  activitiesController.createActivity
);

router.delete('/:id', verifyToken, requireTeacherOrAdmin, activitiesController.deleteActivity);

module.exports = router;
