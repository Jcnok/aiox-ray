# Data Sanitization & Security

## Overview

Story 1.5 implements comprehensive data sanitization to prevent sensitive information (API keys, tokens, PII) from reaching the event collector.

## Features

- **Regex-based Pattern Matching:** Detects common secrets using customizable regex patterns
- **Recursive Sanitization:** Applies rules to nested objects and arrays
- **YAML Configuration:** User-configurable rules in `.aiox-ray-sanitize.yaml`
- **High Performance:** <0.5% overhead on event emission
- **Multiple Secret Types:** AWS keys, JWT tokens, emails, credit cards, database passwords, etc.

## Architecture

### Two-Layer Sanitization

1. **ParameterSanitizer (Story 1.3):** Basic field-name detection
   - Checks if field name is sensitive (e.g., `api_key`, `password`)
   - Fast but may miss secrets in non-obvious field names

2. **RegexSanitizer (Story 1.5):** Pattern-based detection
   - Uses regex patterns to detect actual secret formats
   - Catches secrets in any field name
   - Customizable via configuration file

### Integration Point

Sanitization is applied **before** events leave the CLI instrumentation layer:

```
Agent Code
    ↓
Event Emission
    ↓
Sanitization ← Story 1.5
    ↓
Collector (Story 1.4)
    ↓
PostgreSQL (Durable)
```

## Usage

### Basic Usage

```javascript
const { RegexSanitizer } = require('@aiox-ray/instrumentation');

// Create sanitizer (loads default rules or from .aiox-ray-sanitize.yaml)
const sanitizer = new RegexSanitizer('.aiox-ray-sanitize.yaml');

// Sanitize event payload
const event = {
  agent_id: 'dev',
  payload: {
    aws_key: 'AKIAIOSFODNN7EXAMPLE',
    message: 'Deployment key: AKIAIOSFODNN7EXAMPLE',
  },
};

const sanitized = sanitizer.sanitize(event.payload);
// Result:
// {
//   aws_key: '[REDACTED]',
//   message: 'Deployment key: [REDACTED]'
// }
```

### Configuration

Create `.aiox-ray-sanitize.yaml` in project root:

```yaml
sanitization_rules:
  - name: "AWS_ACCESS_KEY"
    pattern: "AKIA[0-9A-Z]{16}"
    replace_with: "[REDACTED]"

  - name: "JWT_TOKEN"
    pattern: "eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+"
    replace_with: "[REDACTED]"

  # Add custom rules as needed...
```

### Adding Custom Rules

1. Copy `.aiox-ray-sanitize.example.yaml` → `.aiox-ray-sanitize.yaml`
2. Add custom rules to the `sanitization_rules` array
3. Test rule before deploying:

```javascript
const payload = { secret: 'your_test_secret' };
const result = sanitizer.sanitize(payload);
console.log(result); // Should show [REDACTED]
```

## Supported Secret Types

### Default Patterns

| Type | Pattern | Example |
|------|---------|---------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | `AKIAIOSFODNN7EXAMPLE` |
| JWT Token | `eyJ[A-Za-z0-9_-]+...` | `eyJhbGci...` |
| Email | `[a-zA-Z0-9._%+-]+@...` | `user@example.com` |
| Bearer Token | `(?i)(bearer\|token)\s+[a-z0-9._-]+` | `Bearer abc123` |
| Stripe Key | `(sk_live_\|pk_live_)...` | `sk_live_xxx` |
| Credit Card | `[0-9]{4}[\\s-]?[0-9]{4}...` | `4532-1234-5678-9010` |
| Database Password | `(password\|pwd)\s*[=:]...` | `password=secret123` |
| Phone Number | `\\+?[1-9]\\d{1,14}` | `+1-555-123-4567` |

### Adding New Patterns

To detect new secret types:

1. Research the secret format (e.g., is there a prefix?)
2. Write a regex pattern that matches it
3. Test with sample data
4. Add to `.aiox-ray-sanitize.yaml`

**Example:** Detecting Slack tokens

```yaml
- name: "SLACK_TOKEN"
  description: "Slack bot tokens (xoxb- prefix)"
  pattern: "xoxb-[0-9]{10}-[0-9]{10}-[a-zA-Z0-9_-]+"
  replace_with: "[REDACTED]"
```

## Performance

### Benchmarks

- **100 bytes payload:** <1ms
- **1 KB payload:** <2ms
- **10 KB payload:** <10ms
- **Overhead:** <0.5% of total event emission time

### Optimization Tips

1. **Limit custom rules:** Each regex check adds latency
2. **Use specific patterns:** More specific patterns are faster than loose patterns
3. **Order matters:** Put most common patterns first
4. **Precompile patterns:** RegexSanitizer compiles patterns on load (not on every use)

## Fail-Safe Behavior

If sanitization fails:

1. Error is logged (debug level)
2. Event is NOT emitted (security-first)
3. Agent continues normally
4. Check logs for sanitization errors

```javascript
try {
  const sanitized = sanitizer.sanitize(payload);
  emitter.emit('event.type', sanitized);
} catch (error) {
  logger.error(`Sanitization failed: ${error.message}`);
  // Don't emit event if sanitization fails
}
```

## Testing

### Run Tests

```bash
npm test -- --testNamePattern="sanitizer"
```

### Test Coverage

- ✅ AWS key detection
- ✅ JWT token detection
- ✅ Email address detection
- ✅ Bearer token detection
- ✅ Stripe key detection
- ✅ Credit card detection
- ✅ Multiple secrets in one payload
- ✅ Nested object sanitization
- ✅ Array element sanitization
- ✅ Non-sensitive data passthrough
- ✅ Performance (<5ms for 1KB)
- ✅ Custom YAML rule loading

## Backward Compatibility

Story 1.5 adds `RegexSanitizer` without removing `ParameterSanitizer`. Both can be used together:

```javascript
const { ParameterSanitizer, RegexSanitizer } = require('@aiox-ray/instrumentation');

// Apply field-name based sanitization first
let data = ParameterSanitizer.sanitize(payload);

// Then apply pattern-based sanitization
const regexSanitizer = new RegexSanitizer();
data = regexSanitizer.sanitize(data);
```

## Compliance

This implementation helps meet security requirements:

- ✅ **Data Protection:** No secrets in database
- ✅ **Audit Trail:** Logs which patterns matched (not the secrets)
- ✅ **Configurability:** Rules can be customized per environment
- ✅ **Performance:** Minimal overhead
- ✅ **Reliability:** Fail-safe (doesn't block event emission)

## Future Enhancements

- Format-preserving encryption (keep structure, hide value)
- Per-field customization (different rules for different fields)
- Allowlist mode (allow specific patterns instead of blocking)
- Secret severity levels (critical vs warning)
- Webhook notifications for high-severity secrets

## See Also

- Story 1.3: EventEmitter with basic sanitization
- Story 1.4: Collector Service (receives sanitized events)
- Story 1.6: Comprehensive testing and validation
