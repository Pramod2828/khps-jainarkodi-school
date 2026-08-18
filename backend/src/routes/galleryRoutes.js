const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

router.get('/categories', galleryController.getCategories);
router.get('/', galleryController.getGallery);
router.get('/:id/image', galleryController.getGalleryImageStream);

router.post(
  '/', 
  verifyToken, 
  requireTeacherOrAdmin, 
  upload.single('image'), 
  galleryController.createGalleryPhoto
);
router.delete('/:id', verifyToken, requireTeacherOrAdmin, galleryController.deleteGalleryPhoto);

module.exports = router;
