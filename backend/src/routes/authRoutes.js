const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roleCheck');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.getMe);

// Clean OTP Password Recovery Routes
router.get('/teachers-list', authController.getPublicTeachersList);
router.post('/forgot-password/request', authController.requestPasswordReset);
router.post('/forgot-password/verify-otp', authController.verifyOtpCode);
router.post('/forgot-password/reset', authController.resetPasswordWithToken);

// Route accessible by logged in Teachers and Super Admins to update their OWN credentials
router.put('/update-credentials', verifyToken, authController.updateProfileCredentials);

// Inspect accounts route accessible by Super Admin
router.post('/inspect-passwords', verifyToken, requireSuperAdmin, authController.inspectPasswords);

// Restrict admin reset password endpoint to Super Admin
router.post('/change-password', verifyToken, requireSuperAdmin, authController.changePassword);

module.exports = router;
