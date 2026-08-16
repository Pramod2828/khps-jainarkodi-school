const { pool } = require('../config/db');

/**
 * Log action into audit_logs table
 * @param {Object} param0
 * @param {number|null} param0.userId
 * @param {string} param0.userName
 * @param {string} param0.action - CREATE_HOMEWORK, UPDATE_HOMEWORK, DELETE_HOMEWORK, LOGIN, LOGOUT etc.
 * @param {string} param0.module - HOMEWORK, NOTICES, GALLERY, AUTH, STUDENTS, etc.
 * @param {string|number|null} param0.recordId
 * @param {string|null} param0.ipAddress
 * @param {string|null} param0.details
 */
async function logAudit({ userId = null, userName = 'System', action, module, recordId = null, ipAddress = null, details = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, module, record_id, ip_address, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, action, module, recordId ? String(recordId) : null, ipAddress, details]
    );
  } catch (error) {
    console.error('⚠️ Audit Logging Error:', error.message);
  }
}

module.exports = {
  logAudit
};
