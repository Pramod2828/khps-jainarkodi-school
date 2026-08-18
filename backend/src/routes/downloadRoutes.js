const express = require('express');
const router = express.Router();
const downloadsController = require('../controllers/downloadsController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

router.get('/', downloadsController.getDownloads);
router.get('/:id/file', downloadsController.getDownloadFileStream);

router.post('/', verifyToken, requireTeacherOrAdmin, upload.single('file'), downloadsController.createDownload);
router.delete('/:id', verifyToken, requireTeacherOrAdmin, downloadsController.deleteDownload);

module.exports = router;
