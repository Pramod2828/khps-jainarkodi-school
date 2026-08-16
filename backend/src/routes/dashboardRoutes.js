const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');
const { requireTeacherOrAdmin } = require('../middleware/roleCheck');

router.use(verifyToken);
router.use(requireTeacherOrAdmin);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/charts', dashboardController.getDashboardCharts);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
