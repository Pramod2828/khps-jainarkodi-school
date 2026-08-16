const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/downloads
 * Public list of study materials & worksheets
 */
async function getDownloads(req, res) {
  try {
    const { class_id, category, search } = req.query;

    let whereSql = '1=1';
    let queryParams = [];

    if (class_id && class_id !== 'all') {
      whereSql += ' AND (d.class_id = ? OR d.class_id IS NULL)';
      queryParams.push(parseInt(class_id));
    }

    if (category && category !== 'all') {
      whereSql += ' AND d.category = ?';
      queryParams.push(category);
    }

    if (search) {
      whereSql += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    const [rows] = await pool.query(
      `SELECT d.id, d.title, d.description, d.class_id, c.class_name, d.category,
              d.file_url, d.file_size, d.file_type, d.uploaded_by, u.name as uploader_name, d.created_at
       FROM downloads d
       LEFT JOIN classes c ON d.class_id = c.id
       JOIN users u ON d.uploaded_by = u.id
       WHERE ${whereSql}
       ORDER BY d.created_at DESC`,
      queryParams
    );

    return successResponse(res, rows, 'Downloads retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch download materials', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/downloads
 */
async function createDownload(req, res) {
  try {
    const { title, description, class_id, category } = req.body;

    if (!req.file) {
      return errorResponse(res, 'File attachment is required', 400, 'VALIDATION_ERROR');
    }

    if (!title) {
      return errorResponse(res, 'Title is required', 400, 'VALIDATION_ERROR');
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    const [result] = await pool.query(
      `INSERT INTO downloads (title, description, class_id, category, file_url, file_size, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description ? description.trim() : null,
        class_id && class_id !== 'all' ? parseInt(class_id) : null,
        category || 'Worksheets',
        fileUrl,
        req.file.size,
        ext,
        req.user.id
      ]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPLOAD_DOWNLOAD',
      module: 'DOWNLOADS',
      recordId: result.insertId
    });

    return successResponse(res, { id: result.insertId, file_url: fileUrl }, 'Material uploaded successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to upload material', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/downloads/:id
 */
async function updateDownload(req, res) {
  try {
    const { id } = req.params;
    const { title, description, class_id, category } = req.body;

    const [existing] = await pool.query('SELECT * FROM downloads WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Material not found', 404, 'NOT_FOUND');
    }

    let fileUrl = existing[0].file_url;
    let fileSize = existing[0].file_size;
    let fileType = existing[0].file_type;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileSize = req.file.size;
      fileType = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    }

    await pool.query(
      `UPDATE downloads SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        class_id = ?,
        category = COALESCE(?, category),
        file_url = ?,
        file_size = ?,
        file_type = ?
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        description !== undefined ? (description ? description.trim() : null) : existing[0].description,
        class_id && class_id !== 'all' ? parseInt(class_id) : null,
        category || null,
        fileUrl,
        fileSize,
        fileType,
        id
      ]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_DOWNLOAD',
      module: 'DOWNLOADS',
      recordId: id
    });

    return successResponse(res, null, 'Material updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update material', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/downloads/:id
 */
async function deleteDownload(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT file_url FROM downloads WHERE id = ?', [id]);
    if (existing.length > 0 && existing[0].file_url) {
      const fullPath = path.join(__dirname, '../../', existing[0].file_url);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await pool.query('DELETE FROM downloads WHERE id = ?', [id]);

    return successResponse(res, null, 'Material deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete material', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getDownloads,
  createDownload,
  updateDownload,
  deleteDownload
};
