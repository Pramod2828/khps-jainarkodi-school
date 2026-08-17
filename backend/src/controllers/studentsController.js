const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/students
 * Protected for Teachers & Admins
 */
async function getStudents(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '15')));
    const offset = (page - 1) * limit;

    const { class_id, section_id, search, status } = req.query;

    let whereClauses = ['1=1'];
    let queryParams = [];

    if (class_id && class_id !== 'all') {
      whereClauses.push('s.class_id = ?');
      queryParams.push(parseInt(class_id));
    }

    if (section_id && section_id !== 'all') {
      whereClauses.push('s.section_id = ?');
      queryParams.push(parseInt(section_id));
    }

    if (status) {
      whereClauses.push('s.status = ?');
      queryParams.push(status);
    } else {
      whereClauses.push("s.status = 'ACTIVE'");
    }

    if (search) {
      whereClauses.push('(s.full_name LIKE ? OR s.student_code LIKE ? OR s.sat_number LIKE ? OR s.parent_name LIKE ? OR s.address LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM students s WHERE ${whereSql}`, queryParams);
    const total = countRows[0] ? countRows[0].total : 0;

    const [rows] = await pool.query(
      `SELECT s.id, s.student_code, COALESCE(s.sat_number, s.student_code) as sat_number, s.full_name, s.class_id, c.class_name,
              s.section_id, sec.section_name, s.parent_name, s.parent_phone, s.address, s.photo_url, s.status, s.created_at
       FROM students s
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE ${whereSql}
       ORDER BY c.display_order ASC, s.full_name ASC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, rows, 'Student directory retrieved', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('getStudents Error:', error);
    return errorResponse(res, 'Failed to fetch students', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/students/:id
 */
async function getStudentById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.id, s.student_code, COALESCE(s.sat_number, s.student_code) as sat_number, s.full_name, s.class_id, c.class_name,
              s.section_id, sec.section_name, s.parent_name, s.parent_phone, s.address, s.photo_url, s.status, s.created_at
       FROM students s
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Student not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, rows[0], 'Student details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch student details', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/students
 */
async function createStudent(req, res) {
  try {
    const { full_name, class_id, section_id, parent_name, parent_phone, address, student_code, sat_number } = req.body;

    if (!full_name || !class_id || !parent_name || !parent_phone) {
      return errorResponse(res, 'Full name, class, parent name, and parent phone are required.', 400, 'VALIDATION_ERROR');
    }

    const finalSatNo = (sat_number || student_code || `SAT-${Date.now().toString().slice(-6)}`).trim();
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result, meta] = await pool.query(
      `INSERT INTO students (student_code, sat_number, full_name, class_id, section_id, parent_name, parent_phone, address, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        finalSatNo,
        finalSatNo,
        full_name.trim(),
        parseInt(class_id),
        section_id ? parseInt(section_id) : null,
        parent_name.trim(),
        parent_phone.trim(),
        address ? address.trim() : null,
        photoUrl
      ]
    );

    let studentId = null;
    if (meta && meta.insertId) studentId = meta.insertId;
    else if (result && result.insertId) studentId = result.insertId;
    else if (Array.isArray(result) && result[0] && result[0].id) studentId = result[0].id;
    else if (result && result.id) studentId = result.id;

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'User',
      action: 'CREATE_STUDENT',
      module: 'STUDENTS',
      recordId: studentId,
      details: `Added student ${full_name} (${finalSatNo})`
    });

    return successResponse(res, { id: studentId, student_code: finalSatNo, sat_number: finalSatNo }, 'Student record created successfully', 201);
  } catch (error) {
    console.error('createStudent Error:', error);
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
      return errorResponse(res, 'A student with this SAT / Roll Number already exists.', 400, 'DUPLICATE_ENTRY', 'SAT No. / Roll Number already exists');
    }
    return errorResponse(res, 'Failed to create student record', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/students/:id
 */
async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const { student_code, sat_number, full_name, class_id, section_id, parent_name, parent_phone, address, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Student not found', 404, 'NOT_FOUND');
    }

    const finalSatNo = sat_number !== undefined ? (sat_number ? sat_number.trim() : null) : (student_code ? student_code.trim() : existing[0].sat_number);

    let photoUrl = existing[0].photo_url;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      `UPDATE students SET
        student_code = COALESCE(?, student_code),
        sat_number = COALESCE(?, sat_number),
        full_name = COALESCE(?, full_name),
        class_id = COALESCE(?, class_id),
        section_id = COALESCE(?, section_id),
        parent_name = COALESCE(?, parent_name),
        parent_phone = COALESCE(?, parent_phone),
        address = COALESCE(?, address),
        photo_url = ?,
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        finalSatNo,
        finalSatNo,
        full_name ? full_name.trim() : null,
        class_id ? parseInt(class_id) : null,
        section_id ? parseInt(section_id) : null,
        parent_name ? parent_name.trim() : null,
        parent_phone ? parent_phone.trim() : null,
        address !== undefined ? (address ? address.trim() : null) : null,
        photoUrl,
        status || null,
        id
      ]
    );

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'User',
      action: 'UPDATE_STUDENT',
      module: 'STUDENTS',
      recordId: id
    });

    return successResponse(res, null, 'Student record updated successfully');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
      return errorResponse(res, 'A student with this SAT / Roll Number already exists.', 400, 'DUPLICATE_ENTRY', 'SAT No. / Roll Number already exists');
    }
    return errorResponse(res, 'Failed to update student record', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/students/:id
 */
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Student not found', 404, 'NOT_FOUND');
    }

    await logAudit({
      userId: req.user ? req.user.id : 1,
      userName: req.user ? req.user.name : 'User',
      action: 'DELETE_STUDENT',
      module: 'STUDENTS',
      recordId: id
    });

    return successResponse(res, null, 'Student record deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete student record', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};
