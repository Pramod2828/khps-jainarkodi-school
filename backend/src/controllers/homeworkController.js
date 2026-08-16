const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { calculateDayFromDate } = require('../utils/dateHelper');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/homework
 * Public & Admin Homework list with pagination and filters
 */
async function getHomeworkList(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '15')));
    const offset = (page - 1) * limit;

    const { class_id, section_id, subject_id, date, search } = req.query;

    let whereClauses = ['1=1'];
    let queryParams = [];

    if (class_id && class_id !== 'all') {
      whereClauses.push('h.class_id = ?');
      queryParams.push(parseInt(class_id));
    }

    if (section_id && section_id !== 'all') {
      whereClauses.push('h.section_id = ?');
      queryParams.push(parseInt(section_id));
    }

    if (subject_id && subject_id !== 'all') {
      if (subject_id === 'OTHER') {
        whereClauses.push('(h.custom_subject_name IS NOT NULL AND h.custom_subject_name != "")');
      } else {
        whereClauses.push('h.subject_id = ? AND (h.custom_subject_name IS NULL OR h.custom_subject_name = "")');
        queryParams.push(parseInt(subject_id));
      }
    }

    if (date) {
      whereClauses.push('h.homework_date = ?');
      queryParams.push(date);
    }

    if (search) {
      whereClauses.push('(h.title LIKE ? OR h.description LIKE ? OR u.name LIKE ? OR h.custom_teacher_name LIKE ? OR h.custom_subject_name LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM homework h
       JOIN classes c ON h.class_id = c.id
       JOIN subjects sub ON h.subject_id = sub.id
       LEFT JOIN users u ON h.teacher_id = u.id
       WHERE ${whereSql}`,
      queryParams
    );

    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT h.id, h.class_id, c.class_name, h.section_id, sec.section_name,
              h.subject_id, COALESCE(h.custom_subject_name, sub.subject_name) as subject_name, sub.subject_code,
              h.title, h.description, h.homework_date, h.homework_day, h.homework_time,
              h.due_date, h.teacher_id, h.custom_teacher_name, h.custom_subject_name,
              COALESCE(h.custom_teacher_name, u.name, 'Teacher') as teacher_name,
              att.file_path, att.file_name, att.file_type, att.file_size,
              h.created_at, h.updated_at
       FROM homework h
       JOIN classes c ON h.class_id = c.id
       LEFT JOIN sections sec ON h.section_id = sec.id
       JOIN subjects sub ON h.subject_id = sub.id
       LEFT JOIN users u ON h.teacher_id = u.id
       LEFT JOIN homework_attachments att ON h.id = att.homework_id
       WHERE ${whereSql}
       ORDER BY h.homework_date DESC, h.id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

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
      `SELECT h.id, h.class_id, c.class_name, h.section_id, sec.section_name,
              h.subject_id, COALESCE(h.custom_subject_name, sub.subject_name) as subject_name, sub.subject_code,
              h.title, h.description, h.homework_date, h.homework_day, h.homework_time,
              h.due_date, h.teacher_id, h.custom_teacher_name, h.custom_subject_name,
              COALESCE(h.custom_teacher_name, u.name, 'Teacher') as teacher_name,
              att.file_path, att.file_name, att.file_type, att.file_size,
              h.created_at, h.updated_at
       FROM homework h
       JOIN classes c ON h.class_id = c.id
       LEFT JOIN sections sec ON h.section_id = sec.id
       JOIN subjects sub ON h.subject_id = sub.id
       LEFT JOIN users u ON h.teacher_id = u.id
       LEFT JOIN homework_attachments att ON h.id = att.homework_id
       WHERE h.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Homework not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, rows[0], 'Homework details retrieved');
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

    // Auto calculate homework day using Asia/Kolkata date helper
    const homework_day = calculateDayFromDate(homework_date);
    const timeFormatted = homework_time || '16:00:00';
    const assignedTeacherId = teacher_id ? parseInt(teacher_id) : req.user.id;

    // Insert homework
    const [result] = await connection.query(
      `INSERT INTO homework (class_id, section_id, subject_id, custom_subject_name, title, description, homework_date, homework_day, homework_time, due_date, teacher_id, custom_teacher_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        custom_teacher_name ? custom_teacher_name.trim() : null
      ]
    );

    const homeworkId = result.insertId;

    // Handle attachment if uploaded
    if (req.file) {
      const filePath = `/uploads/${req.file.filename}`;
      await connection.query(
        `INSERT INTO homework_attachments (homework_id, file_path, file_name, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [homeworkId, filePath, req.file.originalname, req.file.mimetype, req.file.size]
      );
    }

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: homeworkId,
      ipAddress: req.ip,
      details: `Created homework "${title}" for class ID ${class_id}`
    });

    return successResponse(res, { id: homeworkId, title }, 'Homework created successfully', 201);
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
 * Protected: Teacher / Admin
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
        custom_teacher_name = ?
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
        custom_teacher_name !== undefined ? (custom_teacher_name ? custom_teacher_name.trim() : null) : existing[0].custom_teacher_name,
        id
      ]
    );

    // If new attachment uploaded, replace old
    if (req.file) {
      const [oldAttachments] = await connection.query('SELECT file_path FROM homework_attachments WHERE homework_id = ?', [id]);
      for (const att of oldAttachments) {
        const fullPath = path.join(__dirname, '../../', att.file_path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
      await connection.query('DELETE FROM homework_attachments WHERE homework_id = ?', [id]);

      const filePath = `/uploads/${req.file.filename}`;
      await connection.query(
        `INSERT INTO homework_attachments (homework_id, file_path, file_name, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [id, filePath, req.file.originalname, req.file.mimetype, req.file.size]
      );
    }

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: id,
      ipAddress: req.ip,
      details: `Updated homework ID ${id}`
    });

    return successResponse(res, null, 'Homework updated successfully');
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
 * Protected: Teacher / Admin
 */
async function deleteHomework(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Remove attachment files from storage
    const [attachments] = await connection.query('SELECT file_path FROM homework_attachments WHERE homework_id = ?', [id]);
    for (const att of attachments) {
      const fullPath = path.join(__dirname, '../../', att.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await connection.query('DELETE FROM homework_attachments WHERE homework_id = ?', [id]);
    const [result] = await connection.query('DELETE FROM homework WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return errorResponse(res, 'Homework not found', 404, 'NOT_FOUND');
    }

    await connection.commit();

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_HOMEWORK',
      module: 'HOMEWORK',
      recordId: id,
      ipAddress: req.ip
    });

    return successResponse(res, null, 'Homework deleted successfully');
  } catch (error) {
    await connection.rollback();
    console.error('deleteHomework Error:', error);
    return errorResponse(res, 'Failed to delete homework', 500, 'SERVER_ERROR', error.message);
  } finally {
    connection.release();
  }
}

module.exports = {
  getHomeworkList,
  getHomeworkById,
  createHomework,
  updateHomework,
  deleteHomework
};
