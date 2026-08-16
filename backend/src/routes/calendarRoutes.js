const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { verifyToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roleCheck');

// Public route to view calendar events
router.get('/', calendarController.getCalendarEvents);

// Super Admin restricted modification routes
router.post('/', verifyToken, requireSuperAdmin, calendarController.createCalendarEvent);
router.put('/:id', verifyToken, requireSuperAdmin, calendarController.updateCalendarEvent);
router.delete('/:id', verifyToken, requireSuperAdmin, calendarController.deleteCalendarEvent);

module.exports = router;
