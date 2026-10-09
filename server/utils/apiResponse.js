/**
 * Standard API response utility
 */
class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {String} message - Success message
   * @param {Object} data - Response data
   * @param {Number} statusCode - HTTP status code (default: 200)
   */
  static success(res, message, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Object} error - Error details
   * @param {Number} statusCode - HTTP status code (default: 400)
   */
  static error(res, message, error = {}, statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
      error
    });
  }

  /**
   * Bad request response (400)
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Object} error - Error details
   */
  static badRequest(res, message = 'Bad request', error = {}) {
    return this.error(res, message, error, 400);
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {String} message - Not found message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, {}, 404);
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {String} message - Unauthorized message
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, {}, 401);
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {String} message - Forbidden message
   */
  static forbidden(res, message = 'Forbidden access') {
    return this.error(res, message, {}, 403);
  }

  /**
   * Server error response
   * @param {Object} res - Express response object
   * @param {String} message - Server error message
   * @param {Object} error - Error details
   */
  static serverError(res, message = 'Internal server error', error = {}) {
    console.error('Server Error:', error);
    return this.error(res, message, error, 500);
  }

  /**
   * Accepted response (202)
   * @param {Object} res - Express response object
   * @param {String} message - Success message
   * @param {Object} data - Response data
   */
  static accepted(res, message = 'Accepted', data = {}) {
    return this.success(res, message, data, 202);
  }
}

module.exports = ApiResponse;
