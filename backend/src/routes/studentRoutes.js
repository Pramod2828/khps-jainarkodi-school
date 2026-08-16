const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

// Protected for Teachers and Super Admins
router.get('/', verifyToken, requireTeacherOrAdmin, studentsController.getStudents);
router.get('/:id', verifyToken, requireTeacherOrAdmin, studentsController.getStudentById);

router.post('/', verifyToken, requireTeacherOrAdmin, upload.single('photo'), studentsController.createStudent);
router.put('/:id', verifyToken, requireTeacherOrAdmin, upload.single('photo'), studentsController.updateStudent);
router.delete('/:id', verifyToken, requireTeacherOrAdmin, studentsController.deleteStudent);

module.exports = router;
