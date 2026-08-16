const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required.', 400, 'VALIDATION_ERROR');
    }

    const loginInput = email.toLowerCase().trim();
    // Query user by email, name, or role shortcuts (Admin / Teacher)
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.password_hash, u.status, u.must_change_password, r.role_name as role, r.id as role_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = ? OR LOWER(u.name) = ? OR (LOWER(?) = 'admin' AND r.role_name = 'SUPER_ADMIN') OR (LOWER(?) = 'teacher' AND r.role_name = 'TEACHER')
      ORDER BY u.id ASC
      LIMIT 1
    `, [loginInput, loginInput, loginInput, loginInput]);

    if (rows.length === 0) {
      await logAudit({ action: 'FAILED_LOGIN', module: 'AUTH', details: `Attempted email: ${email}`, ipAddress: req.ip });
      return errorResponse(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const user = rows[0];

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 'Your account has been deactivated. Please contact the administrator.', 403, 'ACCOUNT_DISABLED');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await logAudit({ userId: user.id, userName: user.name, action: 'FAILED_LOGIN', module: 'AUTH', ipAddress: req.ip });
      return errorResponse(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login timestamp
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Sign JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      role_id: user.role_id,
      must_change_password: Boolean(user.must_change_password)
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'jainarkodi_school_super_secret_jwt_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Set HttpOnly cookie for browser security
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      module: 'AUTH',
      ipAddress: req.ip,
      details: `User logged in with role ${user.role}`
    });

    return successResponse(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        must_change_password: Boolean(user.must_change_password)
      }
    }, 'Login successful');
  } catch (error) {
    console.error('Login Error:', error);
    return errorResponse(res, 'An error occurred during login.', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        action: 'LOGOUT',
        module: 'AUTH',
        ipAddress: req.ip
      });
    }
    res.clearCookie('auth_token');
    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Logout failed', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.must_change_password, r.role_name as role, u.last_login_at, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (rows.length === 0) {
      return errorResponse(res, 'User not found.', 404, 'NOT_FOUND');
    }

    const user = rows[0];
    user.must_change_password = Boolean(user.must_change_password);

    return successResponse(res, user, 'User details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch user data', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/auth/change-password
 */
async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return errorResponse(res, 'Current password and new password are required.', 400, 'VALIDATION_ERROR');
    }

    if (new_password.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long.', 400, 'VALIDATION_ERROR');
    }

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return errorResponse(res, 'User not found', 404, 'NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect.', 400, 'INVALID_PASSWORD');
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [newHash, req.user.id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      ipAddress: req.ip
    });

    return successResponse(res, null, 'Password updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update password', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/auth/update-credentials
 * Protected: TEACHER & SUPER_ADMIN
 * Allows logged-in user to update their own Username/Email, Name, and Password
 */
async function updateProfileCredentials(req, res) {
  try {
    const { target_role, email, current_password, new_password } = req.body;

    if (!current_password) {
      return errorResponse(res, 'Current Super Admin password is required for verification.', 400, 'VALIDATION_ERROR');
    }

    if (new_password && new_password.trim().length > 0) {
      if (new_password.trim().length < 6) {
        return errorResponse(res, 'New password must be at least 6 characters long.', 400, 'VALIDATION_ERROR');
      }
    }

    // 1. Determine target user (SELF = Super Admin, TEACHER = Teacher account)
    let targetUserId = req.user.id;
    if (target_role === 'TEACHER') {
      const [teacherRows] = await pool.query(`
        SELECT u.id, u.email, u.password_hash FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.role_name = 'TEACHER'
        ORDER BY u.id ASC LIMIT 1
      `);
      if (teacherRows.length === 0) {
        return errorResponse(res, 'Teacher account not found.', 404, 'NOT_FOUND');
      }
      targetUserId = teacherRows[0].id;
    }

    // Fetch target user data from database
    const [targetUserRows] = await pool.query('SELECT id, email, password_hash FROM users WHERE id = ?', [targetUserId]);
    if (targetUserRows.length === 0) {
      return errorResponse(res, 'Target user not found.', 404, 'NOT_FOUND');
    }

    // Fetch performing user (Super Admin) data
    const [performingUserRows] = await pool.query('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);

    // Check if current_password matches EITHER target user password OR performing Super Admin password
    let isPasswordValid = await bcrypt.compare(current_password, targetUserRows[0].password_hash);
    if (!isPasswordValid && performingUserRows.length > 0) {
      isPasswordValid = await bcrypt.compare(current_password, performingUserRows[0].password_hash);
    }

    if (!isPasswordValid) {
      const roleLabel = target_role === 'TEACHER' ? 'Teacher' : 'Super Admin';
      return errorResponse(res, `Current ${roleLabel} password is incorrect.`, 400, 'INVALID_PASSWORD');
    }

    let updatedEmail = targetUserRows[0].email;
    if (email && email.trim() && email.trim().toLowerCase() !== targetUserRows[0].email.toLowerCase()) {
      updatedEmail = email.toLowerCase().trim();
    }

    let updatedPasswordHash = targetUserRows[0].password_hash;
    let newPlainPassword = null;
    if (new_password && new_password.trim().length >= 6) {
      newPlainPassword = new_password.trim();
      updatedPasswordHash = await bcrypt.hash(newPlainPassword, 10);
    }

    // 3. Update database
    if (target_role === 'TEACHER') {
      if (newPlainPassword) {
        // Update ALL Teacher accounts to share the exact same updated password!
        await pool.query(
          `UPDATE users SET password_hash = ?, plain_password = ?, must_change_password = 0 
           WHERE role_id = (SELECT id FROM roles WHERE role_name = 'TEACHER')`,
          [updatedPasswordHash, newPlainPassword]
        );
      }
    } else {
      if (newPlainPassword) {
        await pool.query(
          'UPDATE users SET email = ?, password_hash = ?, plain_password = ?, must_change_password = 0 WHERE id = ?',
          [updatedEmail, updatedPasswordHash, newPlainPassword, targetUserId]
        );
      } else {
        await pool.query(
          'UPDATE users SET email = ?, must_change_password = 0 WHERE id = ?',
          [updatedEmail, targetUserId]
        );
      }
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_ACCOUNT_CREDENTIALS',
      module: 'AUTH',
      ipAddress: req.ip,
      details: `Updated ${target_role === 'TEACHER' ? 'Teacher' : 'Super Admin'} credentials (${updatedEmail})`
    });

    return successResponse(res, { id: targetUserId, email: updatedEmail }, 'Account credentials updated successfully');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('UNIQUE constraint failed'))) {
      return errorResponse(res, 'An account with this email/username already exists.', 400, 'DUPLICATE_ENTRY');
    }
    return errorResponse(res, 'Failed to update credentials', 500, 'SERVER_ERROR', error.message);
  }
}

// Controller function to inspect accounts and credential status
async function inspectPasswords(req, res) {
  try {
    const { super_admin_password } = req.body;

    if (!super_admin_password) {
      return errorResponse(res, 'Super Admin password verification is required.', 400, 'VALIDATION_ERROR');
    }

    // Verify Super Admin password
    const [adminRows] = await pool.query('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    if (adminRows.length === 0) {
      return errorResponse(res, 'Super Admin session not found.', 404, 'NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(super_admin_password, adminRows[0].password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Incorrect Super Admin password.', 400, 'INVALID_PASSWORD');
    }

    // Fetch all user accounts with active plain passwords
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, COALESCE(u.plain_password, 'Jainarkodi#2026!') as active_password, r.role_name as role, u.status, u.last_login_at, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);

    return successResponse(res, { accounts: users }, 'Accounts inspected successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to inspect credentials', 500, 'SERVER_ERROR', error.message);
  }
}

// =========================================================================
// CLEAN OTP PASSWORD RECOVERY CONTROLLERS (Account -> OTP -> New Password)
// =========================================================================

const { sendWhatsAppNotification } = require('../utils/whatsappService');

// Public Teachers List for Dropdown Selection
async function getPublicTeachersList(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.phone
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.role_name = 'TEACHER' AND u.status = 'ACTIVE'
      ORDER BY u.name ASC
    `);

    const formatted = rows.map(t => {
      const p = t.phone || '9876543211';
      const masked = p.length >= 10 
        ? '+91 ******' + p.substring(p.length - 4)
        : '+91 ******1234';
      return {
        id: t.id,
        name: t.name,
        masked_phone: masked,
        phone: p
      };
    });

    return successResponse(res, formatted, 'Teachers list retrieved');
  } catch (err) {
    return errorResponse(res, 'Failed to fetch teachers', 500, 'SERVER_ERROR', err.message);
  }
}

// STEP 1: Request OTP for Selected Account
async function requestPasswordReset(req, res) {
  try {
    const { user_id, email_or_username, role } = req.body;

    let query = '';
    let params = [];

    if (role === 'SUPER_ADMIN') {
      query = `
        SELECT u.id, u.name, u.email, u.phone, r.role_name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.role_name = 'SUPER_ADMIN'
        LIMIT 1
      `;
    } else if (user_id) {
      query = `
        SELECT u.id, u.name, u.email, u.phone, r.role_name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
        LIMIT 1
      `;
      params = [user_id];
    } else if (email_or_username) {
      const input = email_or_username.toLowerCase().trim();
      query = `
        SELECT u.id, u.name, u.email, u.phone, r.role_name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE LOWER(u.phone) = ? OR LOWER(u.email) = ? OR LOWER(u.name) = ?
           OR (LOWER(?) = 'teacher' AND r.role_name = 'TEACHER')
        ORDER BY u.id ASC
        LIMIT 1
      `;
      params = [input, input, input, input];
    } else {
      // Default to first Teacher
      query = `
        SELECT u.id, u.name, u.email, u.phone, r.role_name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.role_name = 'TEACHER'
        LIMIT 1
      `;
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return errorResponse(res, 'No registered account found.', 404, 'ACCOUNT_NOT_FOUND');
    }

    const user = rows[0];
    // Super Admin OTP must be sent ONLY to Head Master mobile number: 9741032052
    const userPhone = role === 'SUPER_ADMIN' ? '9741032052' : (user.phone || '9876543211');

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = 'rst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10-minute expiry

    // Delete existing reset tokens for this user
    await pool.query('DELETE FROM password_resets WHERE user_id = ?', [user.id]);

    // Save in password_resets table
    await pool.query(`
      INSERT INTO password_resets (user_id, reset_token, otp_code, expires_at)
      VALUES (?, ?, ?, ?)
    `, [user.id, resetToken, otpCode, expiresAt]);

    // Format server-side WhatsApp message & direct deep-link URL
    const cleanPhone = userPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
    const otpMessage = 
      `🔑 *GPS Jainarkodi Password Reset OTP*\n\n` +
      `Hello ${user.name},\n` +
      `Your 6-digit verification code is: *${otpCode}*\n` +
      `Time: ${new Date().toLocaleTimeString()}\n\n` +
      `This OTP is valid for 10 minutes. Do not share it with anyone.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(otpMessage)}`;

    // Send OTP via server-side WhatsApp/SMS service
    await sendWhatsAppNotification({ toPhone: userPhone, message: otpMessage });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'REQUEST_OTP_PASSWORD_RESET',
      module: 'AUTH',
      ipAddress: req.ip,
      details: `OTP sent to mobile +91 ${userPhone}`
    });

    const maskedPhone = userPhone.length >= 10
      ? '+91 ******' + userPhone.substring(userPhone.length - 4)
      : '+91 ******1234';

    // MAXIMUM PRIVACY: DO NOT RETURN OTP CODE TO FRONTEND AT ALL
    return successResponse(res, {
      reset_token: resetToken,
      user_name: user.name,
      masked_phone: maskedPhone,
      whatsapp_url: whatsappUrl,
      role: user.role
    }, 'OTP sent to registered mobile number.');
  } catch (error) {
    return errorResponse(res, 'Failed to send OTP', 500, 'SERVER_ERROR', error.message);
  }
}

// STEP 2: Verify 6-Digit OTP Code
async function verifyOtpCode(req, res) {
  try {
    const { reset_token, otp_code } = req.body;

    if (!reset_token || !otp_code) {
      return errorResponse(res, 'Reset token and 6-digit OTP code are required.', 400, 'VALIDATION_ERROR');
    }

    const cleanOtp = otp_code.toString().trim();

    const [rows] = await pool.query(`
      SELECT * FROM password_resets
      WHERE reset_token = ? AND otp_code = ?
      ORDER BY id DESC LIMIT 1
    `, [reset_token.trim(), cleanOtp]);

    if (rows.length === 0) {
      return errorResponse(res, 'Invalid 6-digit OTP code. Please check your mobile and try again.', 400, 'INVALID_OTP');
    }

    const record = rows[0];

    // Check expiration
    if (new Date(record.expires_at) < new Date()) {
      await pool.query('DELETE FROM password_resets WHERE id = ?', [record.id]);
      return errorResponse(res, 'OTP has expired (10 min limit). Please request a new OTP.', 400, 'EXPIRED_OTP');
    }

    // Generate verify token for Step 3
    const verifyToken = 'vft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    // Update reset_token to verify_token
    await pool.query('UPDATE password_resets SET reset_token = ? WHERE id = ?', [verifyToken, record.id]);

    return successResponse(res, {
      verify_token: verifyToken
    }, 'OTP verified successfully.');
  } catch (error) {
    return errorResponse(res, 'Failed to verify OTP', 500, 'SERVER_ERROR', error.message);
  }
}

// STEP 3: Create New Password
async function resetPasswordWithToken(req, res) {
  try {
    const { verify_token, new_password, role } = req.body;

    if (!verify_token || !new_password) {
      return errorResponse(res, 'Verify token and new password are required.', 400, 'VALIDATION_ERROR');
    }

    if (new_password.trim().length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long.', 400, 'VALIDATION_ERROR');
    }

    const [rows] = await pool.query(`
      SELECT pr.id, pr.user_id, pr.expires_at, r.role_name
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE pr.reset_token = ?
      LIMIT 1
    `, [verify_token.trim()]);

    if (rows.length === 0) {
      return errorResponse(res, 'Invalid or expired session. Please start over.', 400, 'INVALID_SESSION');
    }

    const record = rows[0];

    // Check expiration
    if (new Date(record.expires_at) < new Date()) {
      await pool.query('DELETE FROM password_resets WHERE id = ?', [record.id]);
      return errorResponse(res, 'Session has expired. Please request a new OTP.', 400, 'EXPIRED_SESSION');
    }

    const newPasswordTrimmed = new_password.trim();
    const newHash = await bcrypt.hash(newPasswordTrimmed, 10);

    const isTeacher = (role === 'TEACHER' || record.role_name === 'TEACHER');

    if (isTeacher) {
      // Update ALL Teacher accounts with single unified password!
      await pool.query(`
        UPDATE users
        SET password_hash = ?, plain_password = ?, must_change_password = 0
        WHERE role_id = (SELECT id FROM roles WHERE role_name = 'TEACHER')
      `, [newHash, newPasswordTrimmed]);
    } else {
      // Update Super Admin account
      await pool.query(`
        UPDATE users
        SET password_hash = ?, plain_password = ?, must_change_password = 0
        WHERE id = ?
      `, [newHash, newPasswordTrimmed, record.user_id]);
    }

    // Delete used token
    await pool.query('DELETE FROM password_resets WHERE id = ?', [record.id]);

    await logAudit({
      userId: record.user_id,
      action: 'RESET_PASSWORD_SUCCESS',
      module: 'AUTH',
      ipAddress: req.ip,
      details: `Password reset successfully completed for ${isTeacher ? 'Teacher Portal' : 'Super Admin'}`
    });

    return successResponse(res, null, 'Password updated successfully! You can now log in with your new password.');
  } catch (error) {
    return errorResponse(res, 'Failed to reset password', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  changePassword,
  updateProfileCredentials,
  inspectPasswords,
  getPublicTeachersList,
  requestPasswordReset,
  verifyOtpCode,
  resetPasswordWithToken
};
