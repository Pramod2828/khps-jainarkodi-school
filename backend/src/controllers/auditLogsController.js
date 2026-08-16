const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * GET /api/audit-logs
 * Protected: SUPER_ADMIN Only
 */
async function getAuditLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const offset = (page - 1) * limit;

    const { module, action, search } = req.query;

    let whereSql = '1=1';
    let queryParams = [];

    if (module && module !== 'all') {
      whereSql += ' AND al.module = ?';
      queryParams.push(module);
    }

    if (action && action !== 'all') {
      whereSql += ' AND al.action = ?';
      queryParams.push(action);
    }

    if (search) {
      whereSql += ' AND (al.user_name LIKE ? OR al.details LIKE ? OR al.action LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM audit_logs al WHERE ${whereSql}`, queryParams);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT al.id, al.user_id, al.user_name, al.action, al.module, al.record_id, al.ip_address, al.details, al.created_at
       FROM audit_logs al
       WHERE ${whereSql}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return successResponse(res, rows, 'Audit logs retrieved', 200, {
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch audit logs', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getAuditLogs
};
