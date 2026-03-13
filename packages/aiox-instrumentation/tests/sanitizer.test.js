/**
 * Comprehensive tests for RegexSanitizer
 * Story 1.5: Data Sanitization & Security
 */

const { RegexSanitizer, ParameterSanitizer } = require('../src/sanitizer');

describe('RegexSanitizer', () => {
  let sanitizer;

  beforeAll(() => {
    sanitizer = new RegexSanitizer();
    // Mock logger to avoid console spam during tests
    sanitizer.setLogger({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    });
  });

  describe('AWS Key Detection', () => {
    test('should detect and redact AWS Access Key', () => {
      const payload = {
        aws_key: 'AKIAIOSFODNN7EXAMPLE',
        message: 'Using AKIAIOSFODNN7EXAMPLE',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.aws_key).toBe('[REDACTED]');
      expect(result.message).toContain('[REDACTED]');
    });

    test('should not redact non-AWS keys', () => {
      const payload = {
        api_key: 'not-a-real-key',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.api_key).toBe('not-a-real-key');
    });
  });

  describe('JWT Token Detection', () => {
    test('should detect and redact JWT tokens', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const payload = {
        token: token,
        header: `Bearer ${token}`,
      };

      const result = sanitizer.sanitize(payload);

      expect(result.token).toBe('[REDACTED]');
      expect(result.header).toContain('[REDACTED]');
    });
  });

  describe('Email Detection', () => {
    test('should detect and redact email addresses', () => {
      const payload = {
        user_email: 'john.doe@example.com',
        message: 'Contact us at support@company.com for help',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.user_email).toBe('[REDACTED]');
      expect(result.message).toContain('[REDACTED]');
    });
  });

  describe('Bearer Token Detection', () => {
    test('should detect and redact Bearer tokens', () => {
      const payload = {
        auth: 'Bearer eyJhbGciOiJIUzI1NiJ9',
        alternative: 'TOKEN abc123def456',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.auth).toContain('[REDACTED]');
      expect(result.alternative).toContain('[REDACTED]');
    });
  });

  describe('Stripe Key Detection', () => {
    test('should detect and redact Stripe keys', () => {
      const payload = {
        stripe_key: 'sk_live_testkey123456789test',
        public_key: 'pk_live_testkey987654321test',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.stripe_key).toBe('[REDACTED]');
      expect(result.public_key).toBe('[REDACTED]');
    });
  });

  describe('Credit Card Detection', () => {
    test('should detect and redact credit card numbers', () => {
      const payload = {
        card_number: '4532-1234-5678-9010',
        message: 'Card: 4532123456789010',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.card_number).toBe('[REDACTED]');
      expect(result.message).toContain('[REDACTED]');
    });
  });

  describe('Multiple Secrets in Payload', () => {
    test('should redact multiple secrets in same payload', () => {
      const payload = {
        aws_key: 'AKIAIOSFODNN7EXAMPLE',
        stripe_key: 'sk_live_testkey123456789test',
        email: 'user@example.com',
        message: 'AWS AKIAIOSFODNN7EXAMPLE with email user@example.com',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.aws_key).toBe('[REDACTED]');
      expect(result.stripe_key).toBe('[REDACTED]');
      expect(result.email).toBe('[REDACTED]');
      expect(result.message).toContain('[REDACTED]');
      expect(result.message).not.toContain('AKIA');
      expect(result.message).not.toContain('user@');
    });
  });

  describe('Non-Sensitive Data Passthrough', () => {
    test('should leave non-sensitive data unchanged', () => {
      const payload = {
        user_id: '12345',
        story_title: 'Build Collector Service',
        agent_name: 'Dex',
        status: 'Ready for Review',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.user_id).toBe('12345');
      expect(result.story_title).toBe('Build Collector Service');
      expect(result.agent_name).toBe('Dex');
      expect(result.status).toBe('Ready for Review');
    });
  });

  describe('Nested Objects', () => {
    test('should recursively sanitize nested objects', () => {
      const payload = {
        level1: {
          level2: {
            aws_key: 'AKIAIOSFODNN7EXAMPLE',
            email: 'user@example.com',
          },
          public_info: 'Some public data',
        },
      };

      const result = sanitizer.sanitize(payload);

      expect(result.level1.level2.aws_key).toBe('[REDACTED]');
      expect(result.level1.level2.email).toBe('[REDACTED]');
      expect(result.level1.public_info).toBe('Some public data');
    });
  });

  describe('Array Handling', () => {
    test('should sanitize elements in arrays', () => {
      const payload = [
        { token: 'Bearer abc123' },
        { email: 'user@example.com' },
        { safe_data: 'no secrets' },
      ];

      const result = sanitizer.sanitize(payload);

      expect(result[0].token).toContain('[REDACTED]');
      expect(result[1].email).toBe('[REDACTED]');
      expect(result[2].safe_data).toBe('no secrets');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null and undefined', () => {
      expect(sanitizer.sanitize(null)).toBe(null);
      expect(sanitizer.sanitize(undefined)).toBe(undefined);
    });

    test('should handle empty strings and arrays', () => {
      const payload = {
        empty_string: '',
        empty_array: [],
      };

      const result = sanitizer.sanitize(payload);

      expect(result.empty_string).toBe('');
      expect(result.empty_array).toEqual([]);
    });

    test('should handle numbers and booleans', () => {
      const payload = {
        count: 42,
        is_active: true,
        is_deleted: false,
        score: 3.14,
      };

      const result = sanitizer.sanitize(payload);

      expect(result.count).toBe(42);
      expect(result.is_active).toBe(true);
      expect(result.is_deleted).toBe(false);
      expect(result.score).toBe(3.14);
    });
  });

  describe('Performance', () => {
    test('should sanitize 1KB payload in <5ms', () => {
      const payload = {
        data: 'x'.repeat(1000),
        aws_key: 'AKIAIOSFODNN7EXAMPLE',
      };

      const start = performance.now();
      sanitizer.sanitize(payload);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('should sanitize 10KB payload efficiently', () => {
      const payload = {
        data: 'x'.repeat(10000),
        aws_key: 'AKIAIOSFODNN7EXAMPLE',
        email: 'test@example.com',
      };

      const start = performance.now();
      sanitizer.sanitize(payload);
      const duration = performance.now() - start;

      // Should be fast enough (allow up to 50ms for 10KB)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Database Password Detection', () => {
    test('should detect database passwords', () => {
      const payload = {
        connection_string: 'postgres://user:password=secret123@localhost:5432/db',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.connection_string).toContain('[REDACTED]');
    });
  });
});

describe('ParameterSanitizer (Backward Compatibility)', () => {
  describe('Field Name Detection', () => {
    test('should redact sensitive field names', () => {
      const params = {
        api_key: 'secret-key',
        password: 'secret-password',
        authorization: 'Bearer token123',
      };

      const result = ParameterSanitizer.sanitize(params);

      expect(result.api_key).toBe('[REDACTED]');
      expect(result.password).toBe('[REDACTED]');
      expect(result.authorization).toBe('[REDACTED]');
    });

    test('should handle case-insensitive field names', () => {
      const params = {
        API_KEY: 'secret',
        ApiKey: 'secret',
        api_key: 'secret',
      };

      const result = ParameterSanitizer.sanitize(params);

      expect(result.API_KEY).toBe('[REDACTED]');
      expect(result.ApiKey).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
    });
  });

  describe('Truncation', () => {
    test('should truncate long strings', () => {
      const longString = 'x'.repeat(600);
      const result = ParameterSanitizer.truncate(longString, 500);

      expect(result.length).toBe(500);
      expect(result.endsWith('...')).toBe(true);
    });

    test('should not truncate short strings', () => {
      const shortString = 'short string';
      const result = ParameterSanitizer.truncate(shortString, 500);

      expect(result).toBe('short string');
    });
  });
});
