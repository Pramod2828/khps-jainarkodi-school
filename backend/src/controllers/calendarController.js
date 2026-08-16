const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/calendar
 * Public calendar events
 */
async function getCalendarEvents(req, res) {
  try {
    const { event_type, upcoming, limit } = req.query;
    let query = 'SELECT ce.*, u.name as created_by_name FROM calendar_events ce JOIN users u ON ce.created_by = u.id WHERE 1=1';
    let params = [];

    if (event_type && event_type !== 'all') {
      query += ' AND ce.event_type = ?';
      params.push(event_type.toUpperCase());
    }

    if (upcoming === 'true') {
      query += " AND COALESCE(ce.end_date, ce.start_date) >= DATE('now', 'localtime')";
    }

    query += ' ORDER BY ce.start_date ASC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const [rows] = await pool.query(query, params);
    return successResponse(res, rows, 'Calendar events retrieved');
  } catch (error) {
    console.error('getCalendarEvents Error:', error);
    return errorResponse(res, 'Failed to fetch calendar events', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * POST /api/calendar
 */
async function createCalendarEvent(req, res) {
  try {
    const { title, description, start_date, end_date, event_type } = req.body;
    if (!title || !start_date) {
      return errorResponse(res, 'Title and date are required.', 400, 'VALIDATION_ERROR');
    }

    const finalEndDate = end_date || start_date;
    const type = ['HOLIDAY', 'EXAM', 'PARENT_MEETING', 'SCHOOL_EVENT', 'CELEBRATION', 'IMPORTANT_DATE'].includes(event_type) ? event_type : 'SCHOOL_EVENT';

    const [result] = await pool.query(
      `INSERT INTO calendar_events (title, description, start_date, end_date, event_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title.trim(), description ? description.trim() : null, start_date, finalEndDate, type, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_CALENDAR_EVENT',
      module: 'CALENDAR',
      recordId: result.insertId
    });

    return successResponse(res, { id: result.insertId }, 'Calendar event created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create event', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/calendar/:id
 */
async function updateCalendarEvent(req, res) {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, event_type } = req.body;

    const [existing] = await pool.query('SELECT * FROM calendar_events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Event not found', 404, 'NOT_FOUND');
    }

    const type = event_type && ['HOLIDAY', 'EXAM', 'PARENT_MEETING', 'SCHOOL_EVENT', 'CELEBRATION', 'IMPORTANT_DATE'].includes(event_type)
      ? event_type
      : existing[0].event_type;

    const finalStartDate = start_date || existing[0].start_date;
    const finalEndDate = end_date || (start_date ? start_date : existing[0].end_date);

    await pool.query(
      `UPDATE calendar_events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        start_date = ?,
        end_date = ?,
        event_type = ?
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        description !== undefined ? (description ? description.trim() : null) : existing[0].description,
        finalStartDate,
        finalEndDate,
        type,
        id
      ]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_CALENDAR_EVENT',
      module: 'CALENDAR',
      recordId: id
    });

    return successResponse(res, null, 'Calendar event updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update event', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/calendar/:id
 */
async function deleteCalendarEvent(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM calendar_events WHERE id = ?', [id]);
    return successResponse(res, null, 'Calendar event deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete event', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
