const { pool, getConnection } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { calculateDayFromDate } = require('../utils/dateHelper');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

function sanitizeUrl(url, type, id) {
  if (!url) return null;
  const str = String(url).trim();
  if (str.startsWith('data:') || str.length > 300) {
    return `/api/${type}/${id}/${type === 'homework' ? 'attachment' : type === 'gallery' ? 'image' : type === 'activities' ? 'cover' : 'file'}`;
  }
  return str;
}

/**
 * GET /api/homework
 * Public & Admin list with batch attachment query & lightweight URL resolution
 */
async function getHomeworkList(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '15')));
    const offset = (page - 1) * limit;

    const { class_id, section_id, subject_id, search } = req.query;

    let whereConditions = ['1=1'];
    let queryParams = [];

    if (class_id && class_id !== 'all') {
      whereConditions.push('h.class_id = ?');
      queryParams.push(parseInt(class_id));
    }

    if (section_id && section_id !== 'all') {
      whereConditions.push('h.section_id = ?');
      queryParams.push(parseInt(section_id));
    }

    if (subject_id && subject_id !== 'all') {
      if (subject_id === 'OTHER') {
        whereConditions.push("h.custom_subject_name IS NOT NULL AND h.custom_subject_name != ''");
      } else {
        whereConditions.push('h.subject_id = ?');
        queryParams.push(parseInt(subject_id));
      }
    }

    if (search) {
      whereConditions.push('(h.title LIKE ? OR h.description LIKE ? OR h.custom_teacher_name LIKE ? OR h.custom_subject_name LIKE ?)');
      const s = `%${search}%`;
      queryParams.push(s, s, s, s);
    }

    const whereSql = whereConditions.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM homework h WHERE ${whereSql}`, queryParams);
    const total = countRows[0] ? countRows[0].total : 0;

    const [rows] = await pool.query(
      `SELECT h.id, h.class_id, c.class_name, h.section_id, sec.section_name,
              h.subject_id, COALESCE(h.custom_subject_name, sub.subject_name) as subject_name, sub.subject_code,
              h.title, h.description, h.homework_date, h.homework_day, h.homework_time, h.due_date,
              h.teacher_id, COALESCE(h.custom_teacher_name, u.name, 'Teacher') as teacher_name,
              h.attachment_url, h.created_at
       FROM homework h
       LEFT JOIN classes c ON h.class_id = c.id
       LEFT JOIN sections sec ON h.section_id = sec.id
       LEFT JOIN subjects sub ON h.subject_id = sub.id
       LEFT JOIN users u ON h.teacher_id = u.id
       WHERE ${whereSql}
       ORDER BY h.homework_date DESC, h.id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    let attachmentsMap = {};
    if (rows.length > 0) {
      try {
        const hwIds = rows.map(r => r.id);
        const placeholders = hwIds.map(() => '?').join(',');
        const [allAttachments] = await pool.query(
          `SELECT id, homework_id, file_path, file_name, file_type, file_size
           FROM homework_attachments
           WHERE homework_id IN (${placeholders})`,
          hwIds
        );

        for (const att of allAttachments) {
          if (!attachmentsMap[att.homework_id]) attachmentsMap[att.homework_id] = [];
          attachmentsMap[att.homework_id].push({
            ...att,
            file_path: sanitizeUrl(att.file_path, 'homework', att.homework_id)
          });
        }
      } catch (e) {
        console.warn('Batch attachments error:', e.message);
      }
    }

    const processedRows = rows.map(hw => {
      const atts = attachmentsMap[hw.id] || [];
      let cleanUrl = sanitizeUrl(hw.attachment_url, 'homework', hw.id);
      if (!cleanUrl && atts.length > 0) {
        cleanUrl = atts[0].file_path;
      }
      return {
        ...hw,
        attachments: atts,
        attachment_url: cleanUrl,
        file_path: cleanUrl,
        has_attachment: !!(cleanUrl || atts.length > 0)
      };
    });

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, processedRows, 'Homework list retrieved successfully', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('getHomeworkList Error:', error);
    return errorResponse(res, 'Failed to fetch homework list', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/homework/:id
 */
async function getHomeworkById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT h.id, h.class_id, c.class_name, h.section_id, h.subject_id,
              COALESCE(h.custom_subject_name, sub.subject_name) as subject_name,
              h.title, h.description, h.homework_date, h.homework_day, h.homework_time, h.due_date,
              h.teacher_id, COALESCE(h.custom_teacher_name, u.name, 'Teacher') as teacher_name,
              h.attachment_url, h.created_at, h.updated_at
       FROM homework h
       LEFT JOIN classes c ON h.class_id = c.id
       LEFT JOIN subjects sub ON h.subject_id = sub.id
       LEFT JOIN users u ON h.teacher_id = u.id
       WHERE h.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Homework record not found', 404, 'NOT_FOUND');
    }

    const hw = rows[0];
    let attachments = [];
    try {
      const [atts] = await pool.query(
        `SELECT id, homework_id, file_path, file_name, file_type, file_size
         FROM homework_attachments WHERE homework_id = ?`,
        [id]
      );
      attachments = atts;
    } catch (e) {}

    hw.attachments = attachments.map(att => ({
      ...att,
      file_path: sanitizeUrl(att.file_path, 'homework', id)
    }));

    hw.attachment_url = sanitizeUrl(hw.attachment_url, 'homework', id);
    if (!hw.attachment_url && hw.attachments.length > 0) {
      hw.attachment_url = hw.attachments[0].file_path;
    }
    hw.file_path = hw.attachment_url;

    return successResponse(res, hw, 'Homework details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch homework details', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/homework/:id/attachment
 * Binary streaming endpoint for homework attachment files
 */
async function getHomeworkAttachmentStream(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT attachment_url FROM homework WHERE id = ?', [id]);
    
    let rawUrl = rows[0] ? rows[0].attachment_url : null;
    if (!rawUrl) {
      const [atts] = await pool.query('SELECT file_path FROM homework_attachments WHERE homework_id = ? LIMIT 1', [id]);
      if (atts.length > 0) rawUrl = atts[0].file_path;
    }

    if (!rawUrl) {
      return res.status(404).send('Attachment not found');
    }

    if (rawUrl.startsWith('data:') || rawUrl.length > 300) {
      let mime = 'application/octet-stream';
      let base64Data = rawUrl;

      if (rawUrl.startsWith('data:')) {
        const parts = rawUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        base64Data = parts[1] ? parts[1].replace(/\s/g, '') : '';
      }

      const fileBuffer = Buffer.from(base64Data, 'base64');
      
      let disposition = 'inline';
      if (mime.includes('word') || mime.includes('officedocument')) {
        disposition = `attachment; filename="homework_${id}.docx"`;
      } else if (mime === 'application/pdf') {
        disposition = `inline; filename="homework_${id}.pdf"`;
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
    console.error('getHomeworkAttachmentStream Error:', error);
    return res.status(500).send('Failed to serve attachment');
  }
}

/**
 * POST /api/homework
 */
async function createHomework(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { class_id, section_id, subject_id, custom_subject_name, title, description, homework_date, homework_time, due_date, teacher_id, custom_teacher_name } = req.body;

    if (!class_id || (!subject_id && !custom_subject_name) || !title || !description || !homework_date || !due_date) {
      return errorResponse(res, 'Class, subject, title, description, homework date, and due date are required.', 400, 'VALIDATION_ERROR');
    }

    let finalSubjectId = subject_id && subject_id !== 'OTHER' ? parseInt(subject_id) : 1;
    const finalCustomSubName = custom_subject_name ? custom_subject_name.trim() : null;

    const homework_day = calculateDayFromDate(homework_date);
    const timeFormatted = homework_time || '16:00:00';
    const assignedTeacherId = teacher_id ? parseInt(teacher_id) : (req.user ? req.user.id : 1);

    let attachmentUrl = null;
    if (req.file) {
      attachmentUrl = `/uploads/${req.file.filename}`;
      try {
        if (fs.existsSync(req.file.path)) {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Str = fileBuffer.toString('base64');
          const mimeType = req.file.mimetype || 'application/octet-stream';
          attachmentUrl = `data:${mimeType};base64,${base64Str}`;
        }
      } catch (e) {}
    }

    const [rows, meta] = await connection.query(
      `INSERT INTO homework (class_id, section_id, subject_id, custom_subject_name, title, description, homework_date, homework_day, homework_time, due_date, teacher_id, custom_teacher_name, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        parseInt(class_id),
        section_id ? parseInt(section_id) : null,
        finalSubjectId,
        finalCustomSubName,
        title.trim(),
        description.trim(),
        homework_date,
        homework_day,
        timeFormatted,
        due_date,
        assignedTeacherId,
        custom_teacher_name ? custom_teacher_name.trim() : null,
        attachmentUrl
      ]
    );

    let homeworkId = null;
    if (meta && meta.insertId) homeworkId = meta.insertId;
    else if (rows && rows.insertId) homeworkId = rows.insertId;
    else if (Array.isArray(rows) && rows[0] && rows[0].id) homeworkId = rows[0].id;
    else if (rows && rows.id) homeworkId = rows.id;

    if (req.file && homeworkId) {
      await connection.query(
        `INSERT INTO homework_attachments (homework_id, file_path, file_name, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [parseInt(homeworkId), attachmentUrl, req.file.originalname, req.file.mimetype, req.file.size]
      );
    }

    await connection.commit();

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Teacher',
      action: 'CREATE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: homeworkId,
      details: `Created homework "${title}" for class ID ${class_id}`
    });

    const returnedAttachmentUrl = attachmentUrl ? `/api/homework/${homeworkId}/attachment` : null;

    return successResponse(res, { id: homeworkId, title, attachment_url: returnedAttachmentUrl, file_path: returnedAttachmentUrl, has_attachment: !!attachmentUrl }, 'Homework created successfully', 201);
  } catch (error) {
    await connection.rollback();
    console.error('createHomework Error:', error);
    return errorResponse(res, 'Failed to create homework', 500, 'SERVER_ERROR', error.message);
  } finally {
    connection.release();
  }
}

/**
 * PUT /api/homework/:id
 */
async function updateHomework(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { class_id, section_id, subject_id, custom_subject_name, title, description, homework_date, homework_time, due_date, teacher_id, custom_teacher_name } = req.body;

    const [existing] = await connection.query('SELECT * FROM homework WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Homework record not found', 404, 'NOT_FOUND');
    }

    let attachmentUrl = existing[0].attachment_url;
    if (req.file) {
      attachmentUrl = `/uploads/${req.file.filename}`;
      try {
        if (fs.existsSync(req.file.path)) {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Str = fileBuffer.toString('base64');
          const mimeType = req.file.mimetype || 'application/octet-stream';
          attachmentUrl = `data:${mimeType};base64,${base64Str}`;
        }
      } catch (e) {}
    }

    const homework_day = homework_date ? calculateDayFromDate(homework_date) : existing[0].homework_day;

    await connection.query(
      `UPDATE homework SET
        class_id = COALESCE(?, class_id),
        section_id = COALESCE(?, section_id),
        subject_id = COALESCE(?, subject_id),
        custom_subject_name = COALESCE(?, custom_subject_name),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        homework_date = COALESCE(?, homework_date),
        homework_day = COALESCE(?, homework_day),
        homework_time = COALESCE(?, homework_time),
        due_date = COALESCE(?, due_date),
        teacher_id = COALESCE(?, teacher_id),
        custom_teacher_name = COALESCE(?, custom_teacher_name),
        attachment_url = COALESCE(?, attachment_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        class_id ? parseInt(class_id) : null,
        section_id ? parseInt(section_id) : null,
        subject_id && subject_id !== 'OTHER' ? parseInt(subject_id) : null,
        custom_subject_name ? custom_subject_name.trim() : null,
        title ? title.trim() : null,
        description ? description.trim() : null,
        homework_date || null,
        homework_day,
        homework_time || null,
        due_date || null,
        teacher_id ? parseInt(teacher_id) : null,
        custom_teacher_name ? custom_teacher_name.trim() : null,
        attachmentUrl,
        id
      ]
    );

    if (req.file) {
      await connection.query(
        `INSERT INTO homework_attachments (homework_id, file_path, file_name, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [id, attachmentUrl, req.file.originalname, req.file.mimetype, req.file.size]
      );
    }

    await connection.commit();

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Teacher',
      action: 'UPDATE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: id
    });

    const returnedAttachmentUrl = attachmentUrl ? `/api/homework/${id}/attachment` : null;

    return successResponse(res, { id, attachment_url: returnedAttachmentUrl, file_path: returnedAttachmentUrl }, 'Homework updated successfully');
  } catch (error) {
    await connection.rollback();
    console.error('updateHomework Error:', error);
    return errorResponse(res, 'Failed to update homework', 500, 'SERVER_ERROR', error.message);
  } finally {
    connection.release();
  }
}

/**
 * DELETE /api/homework/:id
 */
async function deleteHomework(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM homework_attachments WHERE homework_id = ?', [id]);
    const [result] = await pool.query('DELETE FROM homework WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Homework record not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Teacher',
      action: 'DELETE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: id
    });

    return successResponse(res, null, 'Homework assignment deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete homework', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getHomeworkList,
  getHomeworkById,
  getHomeworkAttachmentStream,
  createHomework,
  updateHomework,
  deleteHomework
};
