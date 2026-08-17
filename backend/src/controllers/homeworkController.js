const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

/**
 * Helper to calculate Day of Week from Date string YYYY-MM-DD
 */
function calculateDayFromDate(dateStr) {
  if (!dateStr) return 'Monday';
  const d = new Date(dateStr + 'T00:00:00+05:30');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()] || 'Monday';
}

/**
 * GET /api/homework
 * Public & Admin homework list with filters & pagination
 */
async function getHomeworkList(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10')));
    const offset = (page - 1) * limit;

    const { class_id, subject_id, search } = req.query;

    let whereConditions = ['1=1'];
    let queryParams = [];

    if (class_id && class_id !== 'all') {
      whereConditions.push('h.class_id = ?');
      queryParams.push(parseInt(class_id));
    }

    if (subject_id && subject_id !== 'all') {
      if (subject_id === 'OTHER') {
        whereConditions.push('h.custom_subject_name IS NOT NULL AND h.custom_subject_name != \'\'');
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

    // Fetch attachments for each homework
    for (const hw of rows) {
      const [attachments] = await pool.query(
        'SELECT id, file_path, file_name, file_type, file_size FROM homework_attachments WHERE homework_id = ?',
        [hw.id]
      );
      hw.attachments = attachments;
      if (!hw.attachment_url && attachments.length > 0) {
        hw.attachment_url = attachments[0].file_path;
      }
    }

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, rows, 'Homework list retrieved successfully', 200, {
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
      `SELECT h.*, c.class_name, COALESCE(h.custom_subject_name, sub.subject_name) as subject_name,
              COALESCE(h.custom_teacher_name, u.name, 'Teacher') as teacher_name
       FROM homework h
       LEFT JOIN classes c ON h.class_id = c.id
       LEFT JOIN subjects sub ON h.subject_id = sub.id
       LEFT JOIN users u ON h.teacher_id = u.id
       WHERE h.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Homework assignment not found', 404, 'NOT_FOUND');
    }

    const homework = rows[0];
    const [attachments] = await pool.query('SELECT * FROM homework_attachments WHERE homework_id = ?', [id]);
    homework.attachments = attachments;

    return successResponse(res, homework, 'Homework details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch homework details', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/homework
 * Protected: Teacher / Admin
 */
async function createHomework(req, res) {
  const connection = await pool.getConnection();
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

    // Handle attachment if uploaded via multer
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

    // Insert homework
    const [result] = await connection.query(
      `INSERT INTO homework (class_id, section_id, subject_id, custom_subject_name, title, description, homework_date, homework_day, homework_time, due_date, teacher_id, custom_teacher_name, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    const homeworkId = (result && result.insertId) || (Array.isArray(result) && result[0] ? result[0].id : null);

    if (req.file && homeworkId) {
      await connection.query(
        `INSERT INTO homework_attachments (homework_id, file_path, file_name, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [homeworkId, attachmentUrl, req.file.originalname, req.file.mimetype, req.file.size]
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

    return successResponse(res, { id: homeworkId, title, attachment_url: attachmentUrl }, 'Homework created successfully', 201);
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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { class_id, section_id, subject_id, custom_subject_name, title, description, homework_date, homework_time, due_date, teacher_id, custom_teacher_name } = req.body;

    const [existing] = await connection.query('SELECT * FROM homework WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return errorResponse(res, 'Homework not found', 404, 'NOT_FOUND');
    }

    let finalSubjectId = subject_id && subject_id !== 'OTHER' ? parseInt(subject_id) : existing[0].subject_id;
    const finalCustomSubName = custom_subject_name !== undefined ? (custom_subject_name ? custom_subject_name.trim() : null) : existing[0].custom_subject_name;
    const homework_day = homework_date ? calculateDayFromDate(homework_date) : existing[0].homework_day;

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

      await connection.query(
        `INSERT INTO homework_attachments (homework_id, file_path, file_name, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [id, attachmentUrl, req.file.originalname, req.file.mimetype, req.file.size]
      );
    }

    await connection.query(
      `UPDATE homework SET
        class_id = COALESCE(?, class_id),
        section_id = COALESCE(?, section_id),
        subject_id = ?,
        custom_subject_name = ?,
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        homework_date = COALESCE(?, homework_date),
        homework_day = ?,
        homework_time = COALESCE(?, homework_time),
        due_date = COALESCE(?, due_date),
        teacher_id = COALESCE(?, teacher_id),
        custom_teacher_name = ?,
        attachment_url = COALESCE(?, attachment_url)
       WHERE id = ?`,
      [
        class_id ? parseInt(class_id) : null,
        section_id ? parseInt(section_id) : null,
        finalSubjectId,
        finalCustomSubName,
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

    await connection.commit();

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Teacher',
      action: 'UPDATE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: id
    });

    return successResponse(res, null, 'Homework assignment updated successfully');
  } catch (error) {
    await connection.rollback();
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
      return errorResponse(res, 'Homework assignment not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'Teacher',
      action: 'DELETE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: id
    });

    return successResponse(res, null, 'Homework deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete homework', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getHomeworkList,
  getHomeworkById,
  createHomework,
  updateHomework,
  deleteHomework
};
