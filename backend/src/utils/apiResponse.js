/**
 * Standardized API Response Helper
 */

function successResponse(res, data = null, message = 'Operation successful', statusCode = 200, pagination = null) {
  const response = {
    success: true,
    message,
    data
  };
  if (pagination) {
    response.pagination = pagination;
  }
  return res.status(statusCode).json(response);
}

function errorResponse(res, message = 'Internal server error', statusCode = 500, code = 'SERVER_ERROR', details = null) {
  const response = {
    success: false,
    error: {
      message,
      code,
      details
    }
  };
  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse
};
