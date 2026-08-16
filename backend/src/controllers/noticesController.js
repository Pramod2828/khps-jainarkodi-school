const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/notices
 * Public & Admin notice list with auto-archiving of expired notices
 */
async function getNotices(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10')));
    const offset = (page - 1) * limit;

    const { priority, is_archived, search } = req.query;

    // First auto-archive notices past expiry date
    await pool.query('UPDATE notices SET is_archived = 1 WHERE expiry_date IS NOT NULL AND expiry_date < CURDATE() AND is_archived = 0');

    let whereClauses = ['1=1'];
    let queryParams = [];

    if (priority && priority !== 'all') {
      whereClauses.push('n.priority = ?');
      queryParams.push(priority.toUpperCase());
    }

    if (is_archived !== undefined) {
      whereClauses.push('n.is_archived = ?');
      queryParams.push(is_archived === 'true' || is_archived === '1' ? 1 : 0);
    } else {
      // Default public view: show active non-archived notices
      whereClauses.push('n.is_archived = 0');
    }

    if (search) {
      whereClauses.push('(n.title LIKE ? OR n.description LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM notices n WHERE ${whereSql}`, queryParams);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.description, n.priority, n.notice_date, n.notice_time, n.expiry_date, 
              n.attachment_url, n.is_archived, n.created_by, u.name as author_name, n.created_at, n.updated_at
       FROM notices n
       JOIN users u ON n.created_by = u.id
       WHERE ${whereSql}
       ORDER BY n.notice_date DESC, n.notice_time DESC, n.created_at DESC, n.id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, rows, 'Notices retrieved', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('getNotices Error:', error);
    return errorResponse(res, 'Failed to fetch notices', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/notices/:id
 */
async function getNoticeById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.description, n.priority, n.notice_date, n.notice_time, n.expiry_date, 
              n.attachment_url, n.is_archived, n.created_by, u.name as author_name, n.created_at, n.updated_at
       FROM notices n
       JOIN users u ON n.created_by = u.id
       WHERE n.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Notice not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, rows[0], 'Notice details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch notice details', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/notices
 * Protected: Teacher / Admin
 */
async function createNotice(req, res) {
  try {
    const { title, description, priority, notice_date, notice_time, expiry_date } = req.body;

    if (!title || !description) {
      return errorResponse(res, 'Notice title and description are required.', 400, 'VALIDATION_ERROR');
    }

    const nDate = notice_date || new Date().toISOString().split('T')[0];
    const nTime = notice_time || '10:00:00';
    const nPriority = ['NORMAL', 'IMPORTANT', 'URGENT'].includes(priority) ? priority : 'NORMAL';
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO notices (title, description, priority, notice_date, notice_time, expiry_date, attachment_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), description.trim(), nPriority, nDate, nTime, expiry_date || null, attachmentUrl, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_NOTICE',
      module: 'NOTICES',
      recordId: result.insertId,
      ipAddress: req.ip,
      details: `Created ${nPriority} notice: ${title}`
    });

    return successResponse(res, { id: result.insertId, title }, 'Notice created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create notice', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/notices/:id
 * Protected: Teacher / Admin
 */
async function updateNotice(req, res) {
  try {
    const { id } = req.params;
    const { title, description, priority, notice_date, notice_time, expiry_date, is_archived } = req.body;

    const [existing] = await pool.query('SELECT * FROM notices WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Notice not found', 404, 'NOT_FOUND');
    }

    let attachmentUrl = existing[0].attachment_url;
    if (req.file) {
      if (attachmentUrl) {
        const fullPath = path.join(__dirname, '../../', attachmentUrl);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
      attachmentUrl = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      `UPDATE notices SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        notice_date = COALESCE(?, notice_date),
        notice_time = COALESCE(?, notice_time),
        expiry_date = COALESCE(?, expiry_date),
        attachment_url = ?,
        is_archived = COALESCE(?, is_archived)
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        description ? description.trim() : null,
        priority || null,
        notice_date || null,
        notice_time || null,
        expiry_date || null,
        attachmentUrl,
        is_archived !== undefined ? (is_archived === 'true' || is_archived === 1 ? 1 : 0) : null,
        id
      ]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_NOTICE',
      module: 'NOTICES',
      recordId: id,
      ipAddress: req.ip
    });

    return successResponse(res, null, 'Notice updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update notice', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/notices/:id
 * Protected: Teacher / Admin
 */
async function deleteNotice(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT attachment_url FROM notices WHERE id = ?', [id]);
    if (existing.length > 0 && existing[0].attachment_url) {
      const fullPath = path.join(__dirname, '../../', existing[0].attachment_url);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    const [result] = await pool.query('DELETE FROM notices WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, 'Notice not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_NOTICE',
      module: 'NOTICES',
      recordId: id,
      ipAddress: req.ip
    });

    return successResponse(res, null, 'Notice deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete notice', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
};
