const { errorResponse } = require('../utils/apiResponse');

/**
 * Role authorization middleware factory
 * @param {Array<string>} allowedRoles - e.g. ['SUPER_ADMIN'] or ['SUPER_ADMIN', 'TEACHER']
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return errorResponse(
        res, 
        `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`, 
        403, 
        'FORBIDDEN'
      );
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireSuperAdmin: requireRole(['SUPER_ADMIN']),
  requireTeacherOrAdmin: requireRole(['SUPER_ADMIN', 'TEACHER'])
};
