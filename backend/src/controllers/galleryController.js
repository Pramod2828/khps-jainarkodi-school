const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

function sanitizeUrl(url, type, id) {
  if (!url) return null;
  const str = String(url).trim();
  if (str.startsWith('data:') || str.length > 300) {
    return `/api/${type}/${id}/${type === 'gallery' ? 'image' : 'file'}`;
  }
  return str;
}

/**
 * GET /api/gallery/categories
 */
async function getCategories(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM gallery_categories ORDER BY id ASC');
    return successResponse(res, rows, 'Categories retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch gallery categories', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/gallery
 * Public & Admin gallery photos with pagination & lightweight URL resolution
 */
async function getGallery(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit || '12')));
    const offset = (page - 1) * limit;

    const { category_id } = req.query;

    let whereSql = '1=1';
    let queryParams = [];

    if (category_id && category_id !== 'all') {
      whereSql += ' AND g.category_id = ?';
      queryParams.push(parseInt(category_id));
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM gallery g WHERE ${whereSql}`, queryParams);
    const total = countRows[0] ? countRows[0].total : 0;

    const [rows] = await pool.query(
      `SELECT g.id, g.title, g.description, g.category_id, COALESCE(gc.category_name, 'General') as category_name,
              g.image_url, g.uploaded_by, COALESCE(u.name, 'Admin') as uploader_name, g.created_at
       FROM gallery g
       LEFT JOIN gallery_categories gc ON g.category_id = gc.id
       LEFT JOIN users u ON g.uploaded_by = u.id
       WHERE ${whereSql}
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const processedRows = rows.map(g => {
      const cleanImg = sanitizeUrl(g.image_url, 'gallery', g.id);
      return {
        ...g,
        image_url: cleanImg,
        has_image: !!cleanImg
      };
    });

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, processedRows, 'Gallery photos retrieved', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('getGallery Error:', error);
    return errorResponse(res, 'Failed to fetch gallery photos', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/gallery/:id/image
 * Binary streaming endpoint for gallery images
 */
async function getGalleryImageStream(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT image_url FROM gallery WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].image_url) {
      return res.status(404).send('Image not found');
    }

    const rawUrl = rows[0].image_url;
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
    console.error('getGalleryImageStream Error:', error);
    return res.status(500).send('Failed to serve gallery image');
  }
}

/**
 * POST /api/gallery
 */
async function createGalleryPhoto(req, res) {
  try {
    const file = req.file;
    const { title, description, category_id } = req.body;

    if (!file) {
      return errorResponse(res, 'An image file is required for gallery upload.', 400, 'VALIDATION_ERROR');
    }

    if (!category_id) {
      return errorResponse(res, 'Category is required.', 400, 'VALIDATION_ERROR');
    }

    if (file.size > 10 * 1024 * 1024) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return errorResponse(res, 'Image file size must not exceed 10 MB.', 400, 'FILE_TOO_LARGE');
    }

    let imageUrl = `/uploads/${file.filename}`;
    try {
      if (fs.existsSync(file.path)) {
        const fileBuffer = fs.readFileSync(file.path);
        const base64Str = fileBuffer.toString('base64');
        const mimeType = file.mimetype || 'image/jpeg';
        imageUrl = `data:${mimeType};base64,${base64Str}`;
      }
    } catch (e) {
      console.warn('⚠️ Could not convert image to base64:', e.message);
    }

    const userId = req.user ? req.user.id : 1;

    const [result] = await pool.query(
      `INSERT INTO gallery (title, description, category_id, image_url, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title ? title.trim() : 'School Photo', description ? description.trim() : null, parseInt(category_id), imageUrl, userId]
    );

    const insertedId = result.insertId;

    await logAudit({
      userId: userId,
      userName: req.user ? req.user.name : 'Admin',
      action: 'UPLOAD_GALLERY',
      module: 'GALLERY',
      recordId: insertedId,
      details: `Uploaded gallery photo "${title || 'School Photo'}"`
    });

    const returnedUrl = `/api/gallery/${insertedId}/image`;

    return successResponse(res, { id: insertedId, image_url: returnedUrl }, 'Photo uploaded successfully', 201);
  } catch (error) {
    console.error('uploadGalleryPhoto error:', error);
    return errorResponse(res, 'Failed to upload photo', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/gallery/:id
 */
async function deleteGalleryPhoto(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM gallery WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Photo not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Admin',
      action: 'DELETE_GALLERY',
      module: 'GALLERY',
      recordId: id
    });

    return successResponse(res, null, 'Photo deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete photo', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getCategories,
  getGallery,
  getGalleryImageStream,
  createGalleryPhoto,
  deleteGalleryPhoto
};
