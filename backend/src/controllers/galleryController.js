const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

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
 * Public & Admin gallery photos with pagination & category filter
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
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT g.id, g.title, g.description, g.category_id, gc.category_name, g.image_url, g.uploaded_by, u.name as uploader_name, g.created_at
       FROM gallery g
       JOIN gallery_categories gc ON g.category_id = gc.id
       JOIN users u ON g.uploaded_by = u.id
       WHERE ${whereSql}
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, rows, 'Gallery photos retrieved', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch gallery photos', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/gallery
 * Protected: Teacher / Admin
 */
async function uploadGalleryPhoto(req, res) {
  try {
    const { title, description, category_id } = req.body;

    const file = req.file || (req.files && (req.files.photo?.[0] || req.files.image?.[0]));

    if (!file) {
      return errorResponse(res, 'An image file is required for gallery upload.', 400, 'VALIDATION_ERROR');
    }

    if (!category_id) {
      return errorResponse(res, 'Category is required.', 400, 'VALIDATION_ERROR');
    }

    // Check size limit: 5MB for images
    if (file.size > 5 * 1024 * 1024) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return errorResponse(res, 'Image file size must not exceed 5 MB.', 400, 'FILE_TOO_LARGE');
    }

    const imageUrl = `/uploads/${file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO gallery (title, description, category_id, image_url, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title ? title.trim() : 'School Photo', description ? description.trim() : null, parseInt(category_id), imageUrl, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPLOAD_GALLERY',
      module: 'GALLERY',
      recordId: result.insertId,
      details: `Uploaded gallery photo "${title || 'School Photo'}"`
    });

    return successResponse(res, { id: result.insertId, image_url: imageUrl }, 'Photo uploaded successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to upload photo', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/gallery/:id
 */
async function deleteGalleryPhoto(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT image_url FROM gallery WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Photo not found', 404, 'NOT_FOUND');
    }

    const fullPath = path.join(__dirname, '../../', existing[0].image_url);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await pool.query('DELETE FROM gallery WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
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
  uploadGalleryPhoto,
  deleteGalleryPhoto
};
