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
    let query = 'SELECT a.id, a.content, a.is_active, a.is_banner, a.created_at, u.name as author FROM announcements a JOIN users u ON a.created_by = u.id';
    
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
    if (!content) {
      return errorResponse(res, 'Announcement content is required', 400, 'VALIDATION_ERROR');
    }

    const bannerFlag = is_banner === undefined ? 1 : (is_banner === true || is_banner === 'true' || is_banner === 1 ? 1 : 0);

    const [result] = await pool.query(
      'INSERT INTO announcements (content, is_active, is_banner, created_by) VALUES (?, 1, ?, ?)',
      [content.trim(), bannerFlag, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_ANNOUNCEMENT',
      module: 'ANNOUNCEMENTS',
      recordId: result.insertId
    });

    return successResponse(res, { id: result.insertId }, 'Announcement created', 201);
  } catch (error) {
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

    await pool.query(
      `UPDATE announcements SET
        content = COALESCE(?, content),
        is_active = COALESCE(?, is_active),
        is_banner = COALESCE(?, is_banner)
       WHERE id = ?`,
      [
        content ? content.trim() : null,
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
