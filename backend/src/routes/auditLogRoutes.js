const express = require('express');
const router = express.Router();
const auditLogsController = require('../controllers/auditLogsController');
const { verifyToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roleCheck');

router.use(verifyToken);
router.use(requireSuperAdmin);

router.get('/', auditLogsController.getAuditLogs);

module.exports = router;
