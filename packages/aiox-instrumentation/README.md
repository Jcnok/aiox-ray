# AIOX-Ray Instrumentation Module

Non-blocking event instrumentation for AIOX agents with automatic retry, local queueing, and schema validation.

## Overview

The instrumentation module provides:

- **Event Emission:** Synchronous queueing, asynchronous delivery to Collector
- **Reliability:** Exponential backoff retry (100ms, 200ms, 400ms) with local queue fallback
- **Schema Validation:** Strict validation of event structure and fields
- **Bearer Token Auth:** Authentication with Collector via Bearer tokens
- **Non-blocking:** Event delivery never blocks agent execution
- **Debug Logging:** Optional debug output for troubleshooting

## Installation

```bash
npm install @aiox-ray/instrumentation
```

## Quick Start

```javascript
const { EventEmitter } = require('@aiox-ray/instrumentation');
const { v4: uuidv4 } = require('uuid');

// Create emitter
const emitter = new EventEmitter({
  collectorUrl: process.env.COLLECTOR_URL || 'http://localhost:3001',
  token: process.env.COLLECTOR_TOKEN,
  debug: true, // Optional: enable debug logging
});

// Generate execution ID for request tracking
const executionId = uuidv4();

// Emit agent.started event
emitter.emit('agent.started', {
  agent_id: 'dev',
  execution_id: executionId,
  input: 'Implement feature X',
});

// ... perform agent work ...

// Emit agent.finished event
emitter.emit('agent.finished', {
  agent_id: 'dev',
  execution_id: executionId,
  status: 'success',
  output: 'Feature X implemented',
  duration_ms: 1234,
});

// Optional: wait for queue to flush
await emitter.flush();
```

## API Reference

### EventEmitter

#### Constructor

```javascript
new EventEmitter(options)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collectorUrl` | string | `http://localhost:3001` | Collector endpoint URL |
| `token` | string | `process.env.COLLECTOR_TOKEN` | Bearer token for authentication |
| `debug` | boolean | `true` | Enable debug logging |

#### Methods

##### `emit(eventType, payload)`

Queue event for asynchronous delivery.

**Parameters:**

- `eventType` (string): Event type (e.g., `agent.started`, `agent.finished`)
- `payload` (object): Event data (merged with event_type, timestamp, execution_id)

**Returns:** void (synchronous, non-blocking)

**Throws:** Error if payload validation fails

```javascript
emitter.emit('agent.started', {
  agent_id: 'dev',
  execution_id: uuidv4(),
  input: 'task description',
});
```

##### `setCollectorUrl(url)`

Update collector endpoint URL.

```javascript
emitter.setCollectorUrl('http://collector.example.com:3001');
```

##### `setToken(token)`

Update Bearer token.

```javascript
emitter.setToken('Bearer eyJhbGc...');
```

##### `flush()`

Wait for all queued events to be processed.

**Returns:** Promise<void>

```javascript
await emitter.flush(); // Wait for queue to empty
```

##### `getQueueLength()`

Get current queue size.

**Returns:** number

```javascript
const length = emitter.getQueueLength();
```

### SchemaValidator

#### Static Methods

##### `validateEvent(event)`

Validate event structure against schema.

**Throws:** Error if validation fails

```javascript
SchemaValidator.validateEvent({
  event_type: 'agent.started',
  agent_id: 'dev',
  timestamp: new Date().toISOString(),
  execution_id: uuidv4(),
});
```

##### `validateOptionalFields(event)`

Validate optional fields in event.

```javascript
SchemaValidator.validateOptionalFields({
  duration_ms: 1234,
  status: 'success',
  payload: { /* ... */ },
});
```

## Event Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | string | Event type (e.g., `agent.started`, `agent.finished`) |
| `agent_id` | string | Agent identifier (dev, qa, architect, orchestrator) |
| `timestamp` | string | ISO 8601 timestamp |
| `execution_id` | string | UUID v4 for request tracing |

### Valid Event Types

- `agent.started` - Agent activation
- `agent.finished` - Agent completion
- `skill.executed` - Skill execution
- `error.occurred` - Error event
- `recovery.attempt` - Recovery attempt
- `chain_of_thought` - Chain of thought segment

### Valid Agent IDs

- `dev` - Developer agent
- `qa` - QA agent
- `architect` - Architect agent
- `orchestrator` - Orchestrator agent

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `duration_ms` | number | Execution duration in milliseconds |
| `status` | string | Event status (success, error, partial, timeout, skipped) |
| `payload` | object | Additional event data |
| `input` | string | Task input/description |
| `output` | string | Task output/result |

## Environment Variables

Configure via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `COLLECTOR_URL` | Collector endpoint | `http://localhost:3001` |
| `COLLECTOR_TOKEN` | Bearer token | - |

## Retry Strategy

Events are retried with exponential backoff:

1. **Attempt 1:** Immediate
2. **Attempt 2:** 100ms delay
3. **Attempt 3:** 200ms delay
4. **Attempt 4:** 400ms delay
5. **Final:** Dropped with warning log

Retry is triggered by:
- Network errors (timeout, connection refused)
- HTTP 5xx errors (server errors)
- HTTP 429 (rate limited)

Retry is NOT triggered by:
- HTTP 4xx errors (invalid request) - logged and dropped
- HTTP 2xx success

## Testing

### Unit Tests

```bash
npm test
```

Tests:
- Event emission and queuing
- Schema validation
- Retry logic
- Error handling

### Integration Tests

```bash
npm run test:integration
```

Tests:
- Mock Collector communication
- HTTP request/response handling
- Bearer token inclusion
- Retry behavior with failures

### All Tests

```bash
npm run test:all
```

## Performance

**Event emission overhead:** <1%

- `emit()` is synchronous and non-blocking (~0.1ms)
- Delivery is async (doesn't block agent execution)
- No synchronous I/O in critical path

## Integration with Agents

All AIOX agents use the same instrumentation pattern. Implemented agents: **@dev**, **@qa**, **@architect**

### Integration Pattern (applies to all agents)

#### 1. Import and Initialize

```javascript
// In agent initialization
const { EventEmitter } = require('@aiox-ray/instrumentation');
const { v4: uuidv4 } = require('uuid');

const emitter = new EventEmitter();
```

#### 2. Emit on Activation

```javascript
// Before agent begins processing
const executionId = uuidv4();

emitter.emit('agent.started', {
  agent_id: 'dev', // or 'qa', 'architect'
  execution_id: executionId,
  input: taskDescription,
});
```

#### 3. Emit on Completion

```javascript
// After agent completes (success or error)
emitter.emit('agent.finished', {
  agent_id: 'dev', // or 'qa', 'architect'
  execution_id: executionId,
  status: 'success', // or 'error', 'partial'
  output: result,
  duration_ms: elapsedTime,
});
```

#### 4. Error Handling

Event emission failures are handled gracefully:

```javascript
try {
  emitter.emit('agent.finished', { /* ... */ });
} catch (error) {
  // Validation error (invalid fields)
  console.warn('Event validation failed:', error.message);
  // Agent continues execution - event is not sent
}

// Network errors are retried automatically and logged
// Events are dropped after max retries with warning
```

### Agent-Specific Implementations

Reference implementations provided for each agent:

- **@dev Agent:** `src/dev-agent-hook.js`
- **@qa Agent:** `src/qa-agent-hook.js`
- **@architect Agent:** `src/architect-agent-hook.js`

Each provides:
- `initialize{Agent}AgentInstrumentation()` function
- `execute{Agent}AgentWithInstrumentation()` wrapper

#### Example: @qa Agent

```javascript
const {
  initializeQAAgentInstrumentation,
  executeQAAgentWithInstrumentation,
} = require('@aiox-ray/instrumentation/src/qa-agent-hook');

const emitter = initializeQAAgentInstrumentation();

const result = await executeQAAgentWithInstrumentation(
  emitter,
  'Run test suite',
  async () => {
    // QA agent work here
    return testResults;
  }
);
```

#### Example: @architect Agent

```javascript
const {
  initializeArchitectAgentInstrumentation,
  executeArchitectAgentWithInstrumentation,
} = require('@aiox-ray/instrumentation/src/architect-agent-hook');

const emitter = initializeArchitectAgentInstrumentation();

const result = await executeArchitectAgentWithInstrumentation(
  emitter,
  'Design system architecture',
  async () => {
    // Architect agent work here
    return architectureSpec;
  }
);
```

### Extending for Additional Agents

The same pattern applies to any new agents (@pm, @po, @sm, etc.):

```javascript
// Create new hook file: src/{agent}-agent-hook.js
// Follow the pattern from dev-agent-hook.js
// Change agent_id to match the new agent ('pm', 'po', 'sm', etc.)
```

## SkillHook - Skill Execution Event Capture

Automatically capture skill execution events with sanitized parameters and comprehensive metadata.

### Overview

SkillHook wraps skill functions to emit `skill.executed` events containing:
- Skill name and execution ID
- Sanitized parameters (sensitive fields redacted)
- Duration in milliseconds
- Status (success, error)
- Result summary (first 500 chars or error message)

### Usage

```javascript
const { EventEmitter, SkillHook } = require('@aiox-ray/instrumentation');
const { v4: uuidv4 } = require('uuid');

// Create emitter
const emitter = new EventEmitter();

// Create skill hook
const hook = new SkillHook(emitter, {
  agentId: 'dev',
  executionId: uuidv4(),
  debug: true
});

// Wrap a skill function
const skill = async (api_key, query) => {
  // Your skill implementation
  return await performQuery(api_key, query);
};

const wrappedSkill = hook.wrap('query-database', skill);

// Call wrapped function - events are automatically emitted
const result = await wrappedSkill('secret-key-123', 'SELECT * FROM users');
```

### Event Schema

Emitted events have the following structure:

```javascript
{
  event_type: 'skill.executed',           // Always 'skill.executed'
  agent_id: 'dev',                        // Agent identifier (dev, qa, architect)
  execution_id: '550e8400-e29b-41d4-a716-446655440000',  // UUID v4
  timestamp: '2026-03-13T12:34:56.789Z',  // ISO 8601 timestamp
  skill_name: 'query-database',           // Name of the skill
  parameters: {                           // Sanitized parameters
    api_key: '[REDACTED]',               // Sensitive fields replaced
    query: 'SELECT * FROM users'         // Non-sensitive fields included
  },
  duration_ms: 245,                       // Execution time in milliseconds
  status: 'success',                      // 'success' or 'error'
  result_summary: 'Query returned 5 rows' // First 500 chars of result or error
}
```

### ParameterSanitizer

The `ParameterSanitizer` class automatically redacts sensitive parameter values:

**Sensitive Field Names** (case-insensitive):
- api_key, apiKey, api-key
- token, access_token, refresh_token, session_token
- password, pwd
- secret, credential, credentials
- auth, authorization, bearer
- private_key, private-key
- encryption_key, key

**Usage:**

```javascript
const { ParameterSanitizer } = require('@aiox-ray/instrumentation');

// Sanitize object with sensitive fields
const params = {
  api_key: 'secret-123',
  username: 'alice'
};

const sanitized = ParameterSanitizer.sanitize(params);
// Result: { api_key: '[REDACTED]', username: 'alice' }

// Sanitize nested objects and arrays
const nested = {
  user: { name: 'alice', password: 'secret' },
  items: [
    { id: 1, api_key: 'key-1' }
  ]
};

const sanitizedNested = ParameterSanitizer.sanitize(nested);
// Recursively redacts all sensitive fields at all levels

// Truncate long strings
const long = 'a'.repeat(600);
const truncated = ParameterSanitizer.truncate(long, 500);
// Result: First 497 chars + '...' = 500 total chars
```

### Testing

**Unit Tests:**

```bash
npm test  # Runs both EventEmitter and SkillHook unit tests (37 total)
```

**Integration Tests:**

```bash
npm run test:integration  # Tests with mock Collector (9 total)
```

**All Tests:**

```bash
npm run test:all  # Runs 46 tests total
```

### Integration Pattern

SkillHook follows the same integration pattern as EventEmitter:

1. Create EventEmitter instance
2. Create SkillHook instance with emitter and options
3. Wrap skill functions with `hook.wrap(skillName, skillFunction)`
4. Call wrapped functions normally - events are emitted automatically

### Error Handling

- Skill exceptions are re-thrown after event is emitted
- Event emission failures are logged but don't interrupt skill execution
- Wrapped functions maintain original error behavior

### Performance

- `wrap()` execution: ~0.1ms (synchronous)
- Event emission overhead: <1%
- Non-blocking: all event delivery is asynchronous

---


