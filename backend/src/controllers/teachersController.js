const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/teachers
 * Protected: SUPER_ADMIN & TEACHER
 */
async function getTeachers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.must_change_password, r.role_name as role, u.last_login_at, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);

    return successResponse(res, rows, 'Teachers list retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch teachers', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/teachers
 * Protected: SUPER_ADMIN Only
 */
async function createTeacher(req, res) {
  try {
    const { name, email, phone, password, role_id } = req.body;

    if (!name || !email) {
      return errorResponse(res, 'Name and email are required.', 400, 'VALIDATION_ERROR');
    }

    // Fetch current shared teacher password from database if available
    let sharedPassword = (password && password.trim().length >= 6) ? password.trim() : 'Jainarkodi#2026!';
    let passwordHash = null;

    const [existingTeacher] = await pool.query(`
      SELECT password_hash, plain_password FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.role_name = 'TEACHER' AND u.password_hash IS NOT NULL
      ORDER BY u.id ASC LIMIT 1
    `);

    if (existingTeacher.length > 0 && existingTeacher[0].password_hash) {
      passwordHash = existingTeacher[0].password_hash;
      sharedPassword = existingTeacher[0].plain_password || sharedPassword;
    } else {
      passwordHash = await bcrypt.hash(sharedPassword, 10);
    }

    const roleId = role_id ? parseInt(role_id) : 2; // Default 2 = TEACHER

    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, plain_password, role_id, status, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0)`,
      [name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, passwordHash, sharedPassword, roleId]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_TEACHER',
      module: 'TEACHERS',
      recordId: result.insertId,
      details: `Created teacher account for ${email}`
    });

    return successResponse(res, { id: result.insertId, name, email }, 'Teacher account created successfully', 201);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505' || String(error.code) === '23505' || (error.message && (error.message.includes('unique constraint') || error.message.includes('duplicate key')))) {
      return errorResponse(res, 'An account with this email/username already exists.', 400, 'DUPLICATE_ENTRY', 'Email/username already exists');
    }
    return errorResponse(res, 'Failed to create teacher account', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/teachers/:id
 * Protected: SUPER_ADMIN Only
 * Allows Super Admin to update teacher/user name, email, phone
 */
async function updateTeacher(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return errorResponse(res, 'Name and email are required.', 400, 'VALIDATION_ERROR');
    }

    await pool.query(
      `UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?`,
      [name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, id]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_TEACHER_DETAILS',
      module: 'TEACHERS',
      recordId: id,
      details: `Updated details for user ID ${id}`
    });

    return successResponse(res, null, 'User profile details updated successfully');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 'An account with this email already exists.', 400, 'DUPLICATE_ENTRY');
    }
    return errorResponse(res, 'Failed to update user details', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/teachers/:id/status
 * Protected: SUPER_ADMIN Only
 */
async function updateTeacherStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'INACTIVE'

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return errorResponse(res, 'Status must be ACTIVE or INACTIVE', 400, 'VALIDATION_ERROR');
    }

    if (parseInt(id) === req.user.id) {
      return errorResponse(res, 'You cannot disable your own Super Admin account.', 400, 'FORBIDDEN_ACTION');
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'TOGGLE_TEACHER_STATUS',
      module: 'TEACHERS',
      recordId: id,
      details: `Changed teacher ID ${id} status to ${status}`
    });

    return successResponse(res, null, `Teacher status updated to ${status}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update teacher status', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/teachers/:id/reset-password
 * Protected: SUPER_ADMIN Only
 */
async function resetTeacherPassword(req, res) {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long.', 400, 'VALIDATION_ERROR');
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [newHash, id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'RESET_TEACHER_PASSWORD',
      module: 'TEACHERS',
      recordId: id,
      details: `Reset password for user ID ${id}`
    });

    return successResponse(res, null, 'Teacher password reset successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to reset password', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/teachers/:id
 * Protected: SUPER_ADMIN Only
 */
async function deleteTeacher(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return errorResponse(res, 'You cannot delete your own Super Admin account.', 400, 'FORBIDDEN_ACTION');
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 'User account not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_TEACHER_ACCOUNT',
      module: 'TEACHERS',
      recordId: id,
      details: `Deleted teacher/user account ID ${id}`
    });

    return successResponse(res, null, 'Teacher account deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete teacher account', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getTeachers,
  createTeacher,
  updateTeacher,
  updateTeacherStatus,
  resetTeacherPassword,
  deleteTeacher
};
