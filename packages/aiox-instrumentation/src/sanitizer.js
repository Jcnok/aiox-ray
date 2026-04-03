/**
 * Parameter Sanitizer - Basic filtering for common secrets
 *
 * Story 1.3: Basic sanitization (common sensitive field names)
 * Story 1.5: Comprehensive sanitization (regex patterns)
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

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

/**
 * Regex-based Sanitizer for comprehensive secret pattern matching
 * Loads rules from YAML configuration file
 */
class RegexSanitizer {
  constructor(configPath = null) {
    this.rules = [];
    this.compiledPatterns = [];
    this.logger = console; // Default logger

    if (configPath) {
      this.loadRules(configPath);
    } else {
      this.loadDefaultRules();
    }
  }

  /**
   * Load sanitization rules from YAML file
   * @param {string} configPath - Path to .aiox-ray-sanitize.yaml
   */
  loadRules(configPath) {
    try {
      if (!fs.existsSync(configPath)) {
        this.logger.warn(`Sanitization config not found at ${configPath}, using defaults`);
        this.loadDefaultRules();
        return;
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent);

      if (!config || !config.sanitization_rules || !Array.isArray(config.sanitization_rules)) {
        throw new Error('Invalid config structure: expected sanitization_rules array');
      }

      this.rules = config.sanitization_rules;
      this._compilePatterns();
      this.logger.info(`✅ Loaded ${this.rules.length} sanitization rules from ${configPath}`);
    } catch (error) {
      this.logger.error(`Failed to load sanitization rules: ${error.message}`);
      this.loadDefaultRules();
    }
  }

  /**
   * Load default rules if no config file found
   * @private
   */
  loadDefaultRules() {
    this.rules = [
      {
        name: 'AWS_SECRET_KEY',
        pattern: 'AKIA[0-9A-Z]{16}',
        replace_with: '[REDACTED]',
      },
      {
        name: 'JWT_TOKEN',
        pattern: 'eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+',
        replace_with: '[REDACTED]',
      },
      {
        name: 'EMAIL',
        pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        replace_with: '[REDACTED]',
      },
      {
        name: 'BEARER_TOKEN',
        pattern: '(bearer|token)\\s+[a-z0-9._-]+',
        replace_with: '[REDACTED]',
      },
      {
        name: 'STRIPE_KEY',
        pattern: '(sk_live_|pk_live_)[a-zA-Z0-9]+',
        replace_with: '[REDACTED]',
      },
      {
        name: 'DATABASE_PASSWORD',
        pattern: '(password[=:][^\\s;]+)',
        replace_with: '[REDACTED]',
      },
      {
        name: 'CREDIT_CARD',
        pattern: '[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}',
        replace_with: '[REDACTED]',
      },
      {
        name: 'PHONE_NUMBER',
        pattern: '\\+?[1-9]\\d{1,14}',
        replace_with: '[REDACTED]',
      },
    ];
    this._compilePatterns();
  }

  /**
   * Compile regex patterns from rules
   * @private
   */
  _compilePatterns() {
    this.compiledPatterns = this.rules.map((rule) => {
      try {
        return {
          name: rule.name,
          regex: new RegExp(rule.pattern, 'gi'),
          replace_with: rule.replace_with || '[REDACTED]',
        };
      } catch (error) {
        this.logger.error(`Failed to compile regex for rule ${rule.name}: ${error.message}`);
        return null;
      }
    }).filter(p => p !== null);
  }

  /**
   * Sanitize data using loaded regex rules
   * @param {*} data - Data to sanitize
   * @returns {*} Sanitized data
   */
  sanitize(data) {
    return this._sanitizeValue(data);
  }

  /**
   * Sanitize a single value
   * @private
   */
  _sanitizeValue(value) {
    if (typeof value === 'string') {
      let sanitized = value;
      for (const { regex, replace_with } of this.compiledPatterns) {
        if (regex.test(value)) {
          sanitized = sanitized.replace(regex, replace_with);
        }
      }
      return sanitized;
    }

    if (Array.isArray(value)) {
      return value.map(item => this._sanitizeValue(item));
    }

    if (typeof value === 'object' && value !== null) {
      return this._sanitizeObject(value);
    }

    return value;
  }

  /**
   * Recursively sanitize object
   * @private
   */
  _sanitizeObject(obj) {
    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, val] of Object.entries(obj)) {
      sanitized[key] = this._sanitizeValue(val);
    }

    return sanitized;
  }

  /**
   * Set logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }
}

module.exports = { ParameterSanitizer, RegexSanitizer };
