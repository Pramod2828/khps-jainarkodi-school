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
              d.file_url, d.file_size, d.file_type, d.uploaded_by, COALESCE(u.name, 'Admin') as uploader_name, d.created_at
       FROM downloads d
       LEFT JOIN classes c ON d.class_id = c.id
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE ${whereSql}
       ORDER BY d.created_at DESC`,
      queryParams
    );

    return successResponse(res, rows, 'Downloads retrieved');
  } catch (error) {
    console.error('getDownloads Error:', error);
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

    let fileUrl = `/uploads/${req.file.filename}`;
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    // Store as Base64 Data URL for 100% persistent storage across Render container redeploys
    try {
      if (fs.existsSync(req.file.path)) {
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Str = fileBuffer.toString('base64');
        const mimeType = req.file.mimetype || 'application/octet-stream';
        fileUrl = `data:${mimeType};base64,${base64Str}`;
      }
    } catch (e) {
      console.warn('File buffer conversion warning:', e.message);
    }

    const uploaderId = req.user ? req.user.id : 1;

    const [result, meta] = await pool.query(
      `INSERT INTO downloads (title, description, class_id, category, file_url, file_size, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        title.trim(),
        description ? description.trim() : null,
        class_id && class_id !== 'all' ? parseInt(class_id) : null,
        category || 'Worksheets',
        fileUrl,
        req.file.size,
        ext,
        uploaderId
      ]
    );

    let downloadId = null;
    if (meta && meta.insertId) downloadId = meta.insertId;
    else if (result && result.insertId) downloadId = result.insertId;
    else if (Array.isArray(result) && result[0] && result[0].id) downloadId = result[0].id;
    else if (result && result.id) downloadId = result.id;

    // Sync to downloadable_files table for database backward compatibility
    try {
      await pool.query(
        `INSERT INTO downloadable_files (title, description, class_id, file_path, file_size, file_type, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title.trim(),
          description ? description.trim() : null,
          class_id && class_id !== 'all' ? parseInt(class_id) : null,
          fileUrl,
          req.file.size,
          ext,
          category || 'Worksheets'
        ]
      );
    } catch (syncErr) {}

    await logAudit({
      userId: uploaderId,
      userName: req.user ? req.user.name : 'Admin',
      action: 'UPLOAD_DOWNLOAD',
      module: 'DOWNLOADS',
      recordId: downloadId
    });

    return successResponse(res, { id: downloadId, file_url: fileUrl }, 'Material uploaded successfully', 201);
  } catch (error) {
    console.error('createDownload Error:', error);
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

      try {
        if (fs.existsSync(req.file.path)) {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Str = fileBuffer.toString('base64');
          const mimeType = req.file.mimetype || 'application/octet-stream';
          fileUrl = `data:${mimeType};base64,${base64Str}`;
        }
      } catch (e) {}
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
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Admin',
      action: 'UPDATE_DOWNLOAD',
      module: 'DOWNLOADS',
      recordId: id
    });

    return successResponse(res, null, 'Material updated successfully');
  } catch (error) {
    console.error('updateDownload Error:', error);
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
    if (existing.length > 0 && existing[0].file_url && !existing[0].file_url.startsWith('data:')) {
      const fullPath = path.join(__dirname, '../../', existing[0].file_url);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await pool.query('DELETE FROM downloads WHERE id = ?', [id]);

    return successResponse(res, null, 'Material deleted successfully');
  } catch (error) {
    console.error('deleteDownload Error:', error);
    return errorResponse(res, 'Failed to delete material', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getDownloads,
  createDownload,
  updateDownload,
  deleteDownload
};
