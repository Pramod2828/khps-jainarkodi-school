const express = require('express');
const router = express.Router();
const noticesController = require('../controllers/noticesController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

router.get('/', noticesController.getNotices);
router.get('/:id', noticesController.getNoticeById);

router.post('/', verifyToken, requireTeacherOrAdmin, upload.single('attachment'), noticesController.createNotice);
router.put('/:id', verifyToken, requireTeacherOrAdmin, upload.single('attachment'), noticesController.updateNotice);
router.delete('/:id', verifyToken, requireTeacherOrAdmin, noticesController.deleteNotice);

module.exports = router;
