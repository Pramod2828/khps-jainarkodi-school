const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

// Public GET routes
router.get('/', homeworkController.getHomeworkList);
router.get('/:id/attachment', homeworkController.getHomeworkAttachmentStream);
router.get('/:id', homeworkController.getHomeworkById);

// Protected CUD routes
router.post('/', verifyToken, requireTeacherOrAdmin, upload.single('attachment'), homeworkController.createHomework);
router.put('/:id', verifyToken, requireTeacherOrAdmin, upload.single('attachment'), homeworkController.updateHomework);
router.delete('/:id', verifyToken, requireTeacherOrAdmin, homeworkController.deleteHomework);

module.exports = router;
