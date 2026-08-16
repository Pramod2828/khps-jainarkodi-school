const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/classes
 * Public & Admin dynamic class list with sections and student count
 */
async function getClasses(req, res) {
  try {
    const [classes] = await pool.query(`
      SELECT c.id, c.class_name, c.display_order,
             COUNT(DISTINCT s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id AND s.status = 'ACTIVE'
      GROUP BY c.id, c.class_name, c.display_order
      ORDER BY c.display_order ASC
    `);

    // Fetch sections for each class
    const [sections] = await pool.query('SELECT * FROM sections ORDER BY section_name ASC');

    const result = classes.map(c => ({
      ...c,
      student_count: parseInt(c.student_count || 0),
      sections: sections.filter(sec => sec.class_id === c.id)
    }));

    return successResponse(res, result, 'Classes retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch classes', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/classes/subjects
 * Dynamic list of subjects (by class if query param provided)
 */
async function getSubjects(req, res) {
  try {
    const query = 'SELECT sub.id, sub.subject_name, sub.subject_code as code, sub.subject_code FROM subjects sub ORDER BY sub.subject_name ASC';
    const [rows] = await pool.query(query);
    return successResponse(res, rows, 'Subjects retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch subjects', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/classes/subjects
 * Create a new subject
 */
async function createSubject(req, res) {
  try {
    const { subject_name } = req.body;
    if (!subject_name || !subject_name.trim()) {
      return errorResponse(res, 'Subject name is required', 400, 'VALIDATION_ERROR');
    }

    const subName = subject_name.trim();

    // Check if exists
    const [existing] = await pool.query('SELECT id, subject_name FROM subjects WHERE LOWER(subject_name) = LOWER(?)', [subName]);
    if (existing.length > 0) {
      return successResponse(res, existing[0], 'Subject already exists');
    }

    const code = `SUB-${Date.now().toString().slice(-4)}`;
    const [result] = await pool.query('INSERT INTO subjects (subject_name, subject_code) VALUES (?, ?)', [subName, code]);

    return successResponse(res, { id: result.insertId, subject_name: subName, code }, 'Subject created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create subject', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/classes
 */
async function createClass(req, res) {
  try {
    const { class_name, display_order } = req.body;
    if (!class_name) {
      return errorResponse(res, 'Class name is required', 400, 'VALIDATION_ERROR');
    }

    const [result] = await pool.query(
      'INSERT INTO classes (class_name, display_order) VALUES (?, ?)',
      [class_name.trim(), display_order ? parseInt(display_order) : 0]
    );

    // Auto create section 'A' for new class
    await pool.query('INSERT INTO sections (class_id, section_name) VALUES (?, ?)', [result.insertId, 'A']);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_CLASS',
      module: 'CLASSES',
      recordId: result.insertId
    });

    return successResponse(res, { id: result.insertId, class_name }, 'Class created', 201);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 'Class name already exists', 400, 'DUPLICATE_ENTRY');
    }
    return errorResponse(res, 'Failed to create class', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/classes/:id
 * Edit class name and display order
 */
async function updateClass(req, res) {
  try {
    const { id } = req.params;
    const { class_name, display_order } = req.body;

    if (!class_name) {
      return errorResponse(res, 'Class name is required', 400, 'VALIDATION_ERROR');
    }

    await pool.query(
      'UPDATE classes SET class_name = ?, display_order = ? WHERE id = ?',
      [class_name.trim(), display_order ? parseInt(display_order) : 0, parseInt(id)]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_CLASS',
      module: 'CLASSES',
      recordId: id
    });

    return successResponse(res, { id, class_name, display_order }, 'Class updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update class', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/classes/:id
 * Delete class standard
 */
async function deleteClass(req, res) {
  try {
    const { id } = req.params;

    // Check if there are active students enrolled in this class
    const [students] = await pool.query('SELECT COUNT(*) as count FROM students WHERE class_id = ? AND status = "ACTIVE"', [parseInt(id)]);
    if (students[0].count > 0) {
      return errorResponse(res, `Cannot delete class. There are ${students[0].count} enrolled student(s) in this class.`, 400, 'DEPENDENCY_ERROR');
    }

    await pool.query('DELETE FROM sections WHERE class_id = ?', [parseInt(id)]);
    await pool.query('DELETE FROM classes WHERE id = ?', [parseInt(id)]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_CLASS',
      module: 'CLASSES',
      recordId: id
    });

    return successResponse(res, null, 'Class deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete class', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/classes/:id/sections
 */
async function addSection(req, res) {
  try {
    const { id } = req.params;
    const { section_name } = req.body;

    if (!section_name) {
      return errorResponse(res, 'Section name is required', 400, 'VALIDATION_ERROR');
    }

    const [result] = await pool.query(
      'INSERT INTO sections (class_id, section_name) VALUES (?, ?)',
      [parseInt(id), section_name.trim().toUpperCase()]
    );

    return successResponse(res, { id: result.insertId, section_name }, 'Section added', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add section', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/classes/sections/:section_id
 */
async function deleteSection(req, res) {
  try {
    const { section_id } = req.params;
    await pool.query('DELETE FROM sections WHERE id = ?', [parseInt(section_id)]);
    return successResponse(res, null, 'Section deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete section', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getClasses,
  getSubjects,
  createSubject,
  createClass,
  updateClass,
  deleteClass,
  addSection,
  deleteSection
};
