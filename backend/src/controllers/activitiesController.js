const { pool, getConnection } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/activities
 * Public & Admin activities with pagination and lightweight list URLs
 */
async function getActivities(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10')));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM activities');
    const total = countRows[0] ? countRows[0].total : 0;

    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.description, a.activity_date, a.cover_image, a.video_url, a.created_by, COALESCE(u.name, 'Teacher') as author_name, a.created_at
       FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.activity_date DESC, a.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // FIX 2: Return proxy streaming URL for heavy Base64 cover images in list payload
    const processedRows = rows.map(a => {
      let finalCover = a.cover_image;
      if (finalCover && finalCover.startsWith('data:')) {
        finalCover = `/api/activities/${a.id}/cover`;
      }
      return {
        ...a,
        cover_image: finalCover,
        has_cover: !!a.cover_image
      };
    });

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, processedRows, 'Activities retrieved', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('getActivities Error:', error);
    return errorResponse(res, 'Failed to fetch activities', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/activities/:id
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

    const activity = { ...rows[0] };
    if (activity.cover_image && activity.cover_image.startsWith('data:')) {
      activity.cover_image = `/api/activities/${id}/cover`;
    }

    const [images] = await pool.query('SELECT id, image_url FROM activity_images WHERE activity_id = ?', [id]);
    activity.images = images.map(img => ({
      ...img,
      image_url: img.image_url && img.image_url.startsWith('data:') ? `/api/activities/${id}/image/${img.id}` : img.image_url
    }));

    return successResponse(res, activity, 'Activity details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch activity details', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/activities/:id/cover
 * Binary streaming endpoint for activity cover image
 */
async function getActivityCoverStream(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT cover_image FROM activities WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].cover_image) {
      return res.status(404).send('Cover image not found');
    }

    const rawUrl = rows[0].cover_image;
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
    console.error('getActivityCoverStream Error:', error);
    return res.status(500).send('Failed to serve cover image');
  }
}

/**
 * POST /api/activities
 */
async function createActivity(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { title, description, activity_date, video_url } = req.body;

    if (!title || !description || !activity_date) {
      return errorResponse(res, 'Title, description, and activity date are required.', 400, 'VALIDATION_ERROR');
    }

    let coverImage = null;
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
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Teacher',
      action: 'CREATE_ACTIVITY',
      module: 'ACTIVITIES',
      recordId: activityId,
      details: `Created activity "${title}"`
    });

    const returnedCover = coverImage && coverImage.startsWith('data:') ? `/api/activities/${activityId}/cover` : coverImage;

    return successResponse(res, { id: activityId, title, cover_image: returnedCover }, 'Activity event created successfully', 201);
  } catch (error) {
    await connection.rollback();
    console.error('createActivity Error:', error);
    return errorResponse(res, 'Failed to create activity record', 500, 'SERVER_ERROR', error.message);
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
    await pool.query('DELETE FROM activity_images WHERE activity_id = ?', [id]);
    const [result] = await pool.query('DELETE FROM activities WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Activity not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Teacher',
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
  getActivityCoverStream,
  createActivity,
  deleteActivity
};
