const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/activities
 * Public & Admin activities with pagination
 */
async function getActivities(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10')));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM activities');
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.description, a.activity_date, a.cover_image, a.video_url, a.created_by, COALESCE(u.name, 'Teacher') as author_name, a.created_at
       FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.activity_date DESC, a.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, rows, 'Activities retrieved', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch activities', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/activities/:id
 * Detailed activity view with multi-image gallery
 */
async function getActivityById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.description, a.activity_date, a.cover_image, a.video_url, a.created_by, COALESCE(u.name, 'Teacher') as author_name, a.created_at
       FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Activity not found', 404, 'NOT_FOUND');
    }

    const activity = rows[0];

    // Fetch additional gallery images for this activity
    const [images] = await pool.query('SELECT id, image_url FROM activity_images WHERE activity_id = ?', [id]);
    activity.images = images;

    return successResponse(res, activity, 'Activity details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch activity details', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/activities
 * Protected: Teacher / Admin
 */
async function createActivity(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { title, description, activity_date, video_url } = req.body;

    if (!title || !description || !activity_date) {
      return errorResponse(res, 'Title, description and activity date are required.', 400, 'VALIDATION_ERROR');
    }

    let coverImage = null;

    // Handle files uploaded via multer fields or array
    let rawCoverFile = null;
    if (req.files) {
      if (req.files['cover_image'] && req.files['cover_image'][0]) {
        rawCoverFile = req.files['cover_image'][0];
      } else if (Array.isArray(req.files) && req.files.length > 0) {
        rawCoverFile = req.files[0];
      }
    }

    if (rawCoverFile) {
      coverImage = `/uploads/${rawCoverFile.filename}`;
      try {
        if (fs.existsSync(rawCoverFile.path)) {
          const fileBuffer = fs.readFileSync(rawCoverFile.path);
          const base64Str = fileBuffer.toString('base64');
          const mimeType = rawCoverFile.mimetype || 'image/jpeg';
          coverImage = `data:${mimeType};base64,${base64Str}`;
        }
      } catch (e) {}
    }

    const [result] = await connection.query(
      `INSERT INTO activities (title, description, activity_date, cover_image, video_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title.trim(), description.trim(), activity_date, coverImage, video_url || null, req.user ? req.user.id : 1]
    );

    const activityId = result.insertId;

    // Additional gallery images for activity
    if (req.files && req.files['gallery_images']) {
      for (const file of req.files['gallery_images']) {
        let imgUrl = `/uploads/${file.filename}`;
        try {
          if (fs.existsSync(file.path)) {
            const fileBuffer = fs.readFileSync(file.path);
            const base64Str = fileBuffer.toString('base64');
            const mimeType = file.mimetype || 'image/jpeg';
            imgUrl = `data:${mimeType};base64,${base64Str}`;
          }
        } catch (e) {}

        await connection.query(
          'INSERT INTO activity_images (activity_id, image_url) VALUES (?, ?)',
          [activityId, imgUrl]
        );
      }
    }

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPLOAD_ACTIVITY',
      module: 'ACTIVITIES',
      recordId: activityId,
      details: `Created activity "${title}"`
    });

    return successResponse(res, { id: activityId, title }, 'Activity created successfully', 201);
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 'Failed to create activity', 500, 'SERVER_ERROR', error.message);
  } finally {
    connection.release();
  }
}

/**
 * DELETE /api/activities/:id
 */
async function deleteActivity(req, res) {
  try {
    const { id } = req.params;

    const [images] = await pool.query('SELECT image_url FROM activity_images WHERE activity_id = ?', [id]);
    for (const img of images) {
      const fullPath = path.join(__dirname, '../../', img.image_url);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    const [activity] = await pool.query('SELECT cover_image FROM activities WHERE id = ?', [id]);
    if (activity.length > 0 && activity[0].cover_image) {
      const fullPath = path.join(__dirname, '../../', activity[0].cover_image);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    const [result] = await pool.query('DELETE FROM activities WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, 'Activity not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_ACTIVITY',
      module: 'ACTIVITIES',
      recordId: id
    });

    return successResponse(res, null, 'Activity deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete activity', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getActivities,
  getActivityById,
  createActivity,
  deleteActivity
};
