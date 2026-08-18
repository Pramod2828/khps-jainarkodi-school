const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

function sanitizeUrl(url, type, id) {
  if (!url) return null;
  const str = String(url).trim();
  if (str.startsWith('data:') || str.length > 300) {
    return `/api/${type}/${id}/file`;
  }
  return str;
}

/**
 * GET /api/downloads
 * Public list of study materials & worksheets with lightweight file URLs
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
              d.file_url, d.file_path, d.file_size, d.file_type, d.uploaded_by, COALESCE(u.name, 'Admin') as uploader_name, d.created_at
       FROM downloads d
       LEFT JOIN classes c ON d.class_id = c.id
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE ${whereSql}
       ORDER BY d.created_at DESC`,
      queryParams
    );

    const processedRows = rows.map(d => {
      const cleanUrl = sanitizeUrl(d.file_url || d.file_path, 'downloads', d.id);
      return {
        ...d,
        file_url: cleanUrl,
        file_path: cleanUrl,
        has_file: !!cleanUrl
      };
    });

    return successResponse(res, processedRows, 'Downloads retrieved');
  } catch (error) {
    console.error('getDownloads Error:', error);
    return errorResponse(res, 'Failed to fetch download materials', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/downloads/:id/file
 * Binary streaming endpoint for study material files
 */
async function getDownloadFileStream(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT title, file_url, file_path, file_type FROM downloads WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('File not found');

    const d = rows[0];
    const rawUrl = d.file_url || d.file_path;
    if (!rawUrl) return res.status(404).send('File content not available');

    if (rawUrl.startsWith('data:')) {
      const parts = rawUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const base64Data = parts[1] ? parts[1].replace(/\s/g, '') : '';
      const fileBuffer = Buffer.from(base64Data, 'base64');

      let disposition = 'inline';
      if (mime.includes('word') || mime.includes('officedocument') || mime.includes('octet-stream')) {
        disposition = `attachment; filename="${d.title || 'download'}.${d.file_type || 'docx'}"`;
      } else if (mime === 'application/pdf') {
        disposition = `inline; filename="${d.title || 'document'}.pdf"`;
      }

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', disposition);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Length', fileBuffer.length);
      return res.send(fileBuffer);
    }

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return res.redirect(rawUrl);
    }

    return res.redirect(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);
  } catch (error) {
    console.error('getDownloadFileStream Error:', error);
    return res.status(500).send('Failed to serve download file');
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
      `INSERT INTO downloads (title, description, class_id, category, file_url, file_path, file_size, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        title.trim(),
        description ? description.trim() : null,
        class_id && class_id !== 'all' ? parseInt(class_id) : null,
        category || 'Worksheets',
        fileUrl,
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
    } catch (e) {}

    await logAudit({
      userId: uploaderId,
      userName: req.user ? req.user.name : 'Admin',
      action: 'UPLOAD_STUDY_MATERIAL',
      module: 'DOWNLOADS',
      recordId: downloadId,
      details: `Uploaded study material "${title}"`
    });

    const returnedFileUrl = `/api/downloads/${downloadId}/file`;

    return successResponse(
      res,
      { id: downloadId, title, file_url: returnedFileUrl, file_path: returnedFileUrl },
      'Material uploaded successfully',
      201
    );
  } catch (error) {
    console.error('createDownload Error:', error);
    return errorResponse(res, 'Failed to upload material', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/downloads/:id
 */
async function deleteDownload(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM downloads WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Study material record not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Admin',
      action: 'DELETE_STUDY_MATERIAL',
      module: 'DOWNLOADS',
      recordId: id
    });

    return successResponse(res, null, 'Study material deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete material', 500, 'SERVER_ERROR', error.message);
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
      return errorResponse(res, 'Study material record not found', 404, 'NOT_FOUND');
    }

    const current = existing[0];
    let fileUrl = current.file_url || current.file_path;
    let fileSize = current.file_size;
    let fileType = current.file_type;

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
      } catch (e) {
        console.warn('File buffer conversion warning:', e.message);
      }
    }

    const finalTitle = title ? title.trim() : current.title;
    const finalDesc = description !== undefined ? (description ? description.trim() : null) : current.description;
    const finalClassId = class_id && class_id !== 'all' ? parseInt(class_id) : (class_id === 'all' ? null : current.class_id);
    const finalCategory = category || current.category || 'Worksheets';

    await pool.query(
      `UPDATE downloads
       SET title = ?, description = ?, class_id = ?, category = ?, file_url = ?, file_path = ?, file_size = ?, file_type = ?
       WHERE id = ?`,
      [finalTitle, finalDesc, finalClassId, finalCategory, fileUrl, fileUrl, fileSize, fileType, id]
    );

    try {
      await pool.query(
        `UPDATE downloadable_files
         SET title = ?, description = ?, class_id = ?, category = ?, file_path = ?, file_size = ?, file_type = ?
         WHERE title = ? OR id = ?`,
        [finalTitle, finalDesc, finalClassId, finalCategory, fileUrl, fileSize, fileType, current.title, id]
      );
    } catch (e) {}

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Admin',
      action: 'UPDATE_STUDY_MATERIAL',
      module: 'DOWNLOADS',
      recordId: id,
      details: `Updated study material "${finalTitle}"`
    });

    const returnedFileUrl = `/api/downloads/${id}/file`;

    return successResponse(
      res,
      { id: parseInt(id), title: finalTitle, description: finalDesc, class_id: finalClassId, category: finalCategory, file_url: returnedFileUrl, file_path: returnedFileUrl },
      'Study material updated successfully'
    );
  } catch (error) {
    console.error('updateDownload Error:', error);
    return errorResponse(res, 'Failed to update study material', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getDownloads,
  getDownloadFileStream,
  createDownload,
  updateDownload,
  deleteDownload
};
