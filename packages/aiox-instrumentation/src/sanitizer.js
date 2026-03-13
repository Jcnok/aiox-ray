/**
 * Parameter Sanitizer - Basic filtering for common secrets
 *
 * Story 1.3: Basic sanitization (common sensitive field names)
 * Story 1.5: Comprehensive sanitization (regex patterns)
 */

class ParameterSanitizer {
  /**
   * Sensitive field names to filter
   */
  static SENSITIVE_FIELDS = [
    'api_key',
    'apiKey',
    'api-key',
    'token',
    'password',
    'pwd',
    'secret',
    'credential',
    'credentials',
    'auth',
    'authorization',
    'bearer',
    'access_token',
    'refresh_token',
    'session_token',
    'private_key',
    'private-key',
    'encryption_key',
    'key',
  ];

  /**
   * Sanitize object parameters, filtering sensitive fields
   * @param {object} params - Parameters object to sanitize
   * @returns {object} Sanitized parameters
   */
  static sanitize(params) {
    if (!params || typeof params !== 'object') {
      return params;
    }

    if (Array.isArray(params)) {
      return params.map((item) => this.sanitize(item));
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(params)) {
      if (this._isSensitiveField(key)) {
        // Replace sensitive value with marker
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if field name is sensitive
   * @private
   */
  static _isSensitiveField(fieldName) {
    const lowerName = String(fieldName).toLowerCase();
    return this.SENSITIVE_FIELDS.some(
      (sensitive) => lowerName === sensitive || lowerName.includes(sensitive)
    );
  }

  /**
   * Truncate string to max length
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length (default 500)
   * @returns {string} Truncated string
   */
  static truncate(str, maxLength = 500) {
    if (typeof str !== 'string') {
      return str;
    }

    if (str.length <= maxLength) {
      return str;
    }

    return str.substring(0, maxLength - 3) + '...';
  }
}

module.exports = { ParameterSanitizer };
