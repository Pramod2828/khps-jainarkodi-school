const express = require('express');
const router = express.Router();
const classesController = require('../controllers/classesController');
const { verifyToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roleCheck');

// Public / Teacher GET routes for class and subject lists
router.get('/', classesController.getClasses);
router.get('/subjects', classesController.getSubjects);
router.post('/subjects', verifyToken, classesController.createSubject);

// Super Admin restricted modification routes
router.post('/', verifyToken, requireSuperAdmin, classesController.createClass);
router.put('/:id', verifyToken, requireSuperAdmin, classesController.updateClass);
router.delete('/:id', verifyToken, requireSuperAdmin, classesController.deleteClass);

router.post('/:id/sections', verifyToken, requireSuperAdmin, classesController.addSection);
router.delete('/sections/:section_id', verifyToken, requireSuperAdmin, classesController.deleteSection);

module.exports = router;
