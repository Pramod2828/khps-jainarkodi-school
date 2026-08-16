const express = require('express');
const router = express.Router();
const announcementsController = require('../controllers/announcementsController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');

router.get('/', announcementsController.getAnnouncements);
router.post('/', verifyToken, requireTeacherOrAdmin, announcementsController.createAnnouncement);
router.put('/:id', verifyToken, requireTeacherOrAdmin, announcementsController.updateAnnouncement);
router.delete('/:id', verifyToken, requireTeacherOrAdmin, announcementsController.deleteAnnouncement);

module.exports = router;
