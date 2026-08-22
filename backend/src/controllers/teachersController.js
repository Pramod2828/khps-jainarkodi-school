const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

function sanitizeUrl(url, type, id) {
  if (!url) return null;
  const str = String(url).trim();
  if (str.startsWith('data:') || str.length > 300) {
    return `/api/${type}/${id}/image`;
  }
  return str;
}

/**
 * GET /api/teachers
 * Protected: SUPER_ADMIN & TEACHER
 */
async function getTeachers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.must_change_password,
             r.role_name as role, u.last_login_at, u.created_at,
             u.qualification, u.class_id, c.class_name as teaching_standard, u.photo_url
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN classes c ON u.class_id = c.id
      ORDER BY u.created_at DESC
    `);

    const processedRows = rows.map(u => ({
      ...u,
      photo_url: sanitizeUrl(u.photo_url, 'teachers', u.id)
    }));

    return successResponse(res, processedRows, 'Teachers list retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch teachers', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/teachers/public
 * Public: Homepage display of teacher cards (No passwords, hashes, or auth tokens exposed)
 */
async function getPublicTeachers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.qualification, u.class_id, c.class_name as teaching_standard, u.photo_url
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.status = 'ACTIVE' AND r.role_name = 'TEACHER'
      ORDER BY COALESCE(c.display_order, 99) ASC, u.name ASC
    `);

    const processedRows = rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email || null,
      phone: u.phone || null,
      qualification: u.qualification || null,
      class_id: u.class_id || null,
      teaching_standard: u.teaching_standard || null,
      photo_url: sanitizeUrl(u.photo_url, 'teachers', u.id)
    }));

    return successResponse(res, processedRows, 'Public teachers list retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch public teachers', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/teachers/:id/image
 * Binary streaming endpoint for teacher profile photos
 */
async function getTeacherImageStream(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT photo_url FROM users WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].photo_url) {
      return res.status(404).send('Image not found');
    }

    const rawUrl = rows[0].photo_url;
    if (rawUrl.startsWith('data:')) {
      const parts = rawUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = parts[1] ? parts[1].replace(/\s/g, '') : '';
      const imgBuffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Length', imgBuffer.length);
      return res.send(imgBuffer);
    }

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return res.redirect(rawUrl);
    }

    return res.redirect(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);
  } catch (error) {
    console.error('getTeacherImageStream Error:', error);
    return res.status(500).send('Failed to serve teacher photo');
  }
}

/**
 * POST /api/teachers
 * Protected: SUPER_ADMIN Only
 */
async function createTeacher(req, res) {
  try {
    const { name, email, phone, password, role_id, qualification, class_id } = req.body;

    if (!name || !email) {
      return errorResponse(res, 'Name and email are required.', 400, 'VALIDATION_ERROR');
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
      try {
        if (fs.existsSync(req.file.path)) {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Str = fileBuffer.toString('base64');
          const mimeType = req.file.mimetype || 'image/jpeg';
          photoUrl = `data:${mimeType};base64,${base64Str}`;
        }
      } catch (e) {}
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
    const finalClassId = (class_id && class_id !== 'all') ? parseInt(class_id) : null;
    const finalQual = qualification ? qualification.trim() : null;

    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, plain_password, role_id, status, must_change_password, qualification, class_id, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0, ?, ?, ?)`,
      [name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, passwordHash, sharedPassword, roleId, finalQual, finalClassId, photoUrl]
    );

    let insertId = result.insertId;
    if (!insertId && Array.isArray(result) && result[0] && result[0].id) insertId = result[0].id;

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_TEACHER',
      module: 'TEACHERS',
      recordId: insertId,
      details: `Created teacher account for ${email}`
    });

    return successResponse(res, { id: insertId, name, email }, 'Teacher account created successfully', 201);
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
 * Allows Super Admin to update teacher profile details (name, email, phone, qualification, class_id, photo)
 */
async function updateTeacher(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone, qualification, class_id } = req.body;

    if (!name || !email) {
      return errorResponse(res, 'Name and email are required.', 400, 'VALIDATION_ERROR');
    }

    const [existing] = await pool.query('SELECT photo_url FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'User record not found', 404, 'NOT_FOUND');
    }

    let photoUrl = existing[0].photo_url;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
      try {
        if (fs.existsSync(req.file.path)) {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Str = fileBuffer.toString('base64');
          const mimeType = req.file.mimetype || 'image/jpeg';
          photoUrl = `data:${mimeType};base64,${base64Str}`;
        }
      } catch (e) {}
    }

    const finalClassId = (class_id && class_id !== 'all') ? parseInt(class_id) : null;
    const finalQual = qualification !== undefined ? (qualification ? qualification.trim() : null) : null;

    await pool.query(
      `UPDATE users SET name = ?, email = ?, phone = ?, qualification = ?, class_id = ?, photo_url = ? WHERE id = ?`,
      [name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, finalQual, finalClassId, photoUrl, id]
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
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505' || String(error.code) === '23505') {
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
  getPublicTeachers,
  getTeacherImageStream,
  createTeacher,
  updateTeacher,
  updateTeacherStatus,
  resetTeacherPassword,
  deleteTeacher
};
