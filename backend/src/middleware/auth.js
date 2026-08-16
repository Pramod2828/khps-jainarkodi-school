const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Middleware to verify JWT token from Authorization header or HttpOnly cookie
 */
function verifyToken(req, res, next) {
  let token = null;

  // 1. Check Authorization Bearer header (Preferred for Android APK & SPA)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.auth_token) {
    // 2. Fallback to HttpOnly cookie
    token = req.cookies.auth_token;
  }

  if (!token) {
    return errorResponse(res, 'Authentication required. No token provided.', 401, 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jainarkodi_school_super_secret_jwt_key_2026');
    req.user = decoded; // { id, email, role, role_id, name }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Authentication token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    return errorResponse(res, 'Invalid authentication token.', 401, 'INVALID_TOKEN');
  }
}

/**
 * Optional token check (extract user if available, but don't block request if missing)
 */
function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'jainarkodi_school_super_secret_jwt_key_2026');
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = {
  verifyToken,
  optionalToken
};
