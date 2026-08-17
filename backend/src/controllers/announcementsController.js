const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/announcements
 * Active announcements for public website homepage
 */
async function getAnnouncements(req, res) {
  try {
    const isBannerOnly = req.query.banner === 'true';
    let query = `SELECT a.id, COALESCE(a.content, a.message) as content, COALESCE(a.content, a.message) as message, a.is_active, a.is_banner, a.created_at, COALESCE(u.name, 'Admin') as author
                 FROM announcements a
                 LEFT JOIN users u ON a.created_by = u.id`;

    if (isBannerOnly) {
      query += ' WHERE a.is_active = 1 AND a.is_banner = 1';
    } else if (req.query.all !== 'true') {
      query += ' WHERE a.is_active = 1';
    }

    query += ' ORDER BY a.created_at DESC';

    const [rows] = await pool.query(query);
    return successResponse(res, rows, 'Announcements retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch announcements', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/announcements
 */
async function createAnnouncement(req, res) {
  try {
    const { content, is_banner } = req.body;
    const textContent = content || req.body.message || req.body.tickerText;

    if (!textContent || !textContent.trim()) {
      return errorResponse(res, 'Announcement content is required', 400, 'VALIDATION_ERROR');
    }

    const bannerFlag = is_banner === undefined ? 1 : (is_banner === true || is_banner === 'true' || is_banner === 1 ? 1 : 0);
    const userId = req.user ? req.user.id : 1;

    const [result] = await pool.query(
      'INSERT INTO announcements (content, message, is_active, is_banner, created_by) VALUES (?, ?, 1, ?, ?)',
      [textContent.trim(), textContent.trim(), bannerFlag, userId]
    );

    await logAudit({
      userId: userId,
      userName: req.user ? req.user.name : 'Admin',
      action: 'CREATE_ANNOUNCEMENT',
      module: 'ANNOUNCEMENTS',
      recordId: result.insertId
    });

    return successResponse(res, { id: result.insertId, content: textContent.trim() }, 'Announcement created successfully', 201);
  } catch (error) {
    console.error('createAnnouncement error:', error);
    return errorResponse(res, 'Failed to create announcement', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/announcements/:id
 */
async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { content, is_active, is_banner } = req.body;
    const textContent = content ? content.trim() : null;

    await pool.query(
      `UPDATE announcements SET
        content = COALESCE(?, content),
        message = COALESCE(?, message),
        is_active = COALESCE(?, is_active),
        is_banner = COALESCE(?, is_banner)
       WHERE id = ?`,
      [
        textContent,
        textContent,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        is_banner !== undefined ? (is_banner ? 1 : 0) : null,
        id
      ]
    );

    return successResponse(res, null, 'Announcement updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update announcement', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/announcements/:id
 */
async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
    return successResponse(res, null, 'Announcement deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete announcement', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
