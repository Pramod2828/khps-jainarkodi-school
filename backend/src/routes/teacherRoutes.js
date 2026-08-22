const express = require('express');
const router = express.Router();
const teachersController = require('../controllers/teachersController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin, requireSuperAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

// Public endpoints
router.get('/public', teachersController.getPublicTeachers);
router.get('/:id/image', teachersController.getTeacherImageStream);

// Allow both Teachers and Super Admins to fetch teacher list (for homework/notice assignment)
router.get('/', verifyToken, requireTeacherOrAdmin, teachersController.getTeachers);

// Super Admin restricted account management routes
router.post('/', verifyToken, requireSuperAdmin, upload.single('photo'), teachersController.createTeacher);
router.put('/:id', verifyToken, requireSuperAdmin, upload.single('photo'), teachersController.updateTeacher);
router.put('/:id/status', verifyToken, requireSuperAdmin, teachersController.updateTeacherStatus);
router.post('/:id/reset-password', verifyToken, requireSuperAdmin, teachersController.resetTeacherPassword);
router.delete('/:id', verifyToken, requireSuperAdmin, teachersController.deleteTeacher);

module.exports = router;
