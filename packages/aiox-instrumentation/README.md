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

## Integration with @dev Agent

### 1. Import and Initialize

```javascript
// In @dev agent initialization
const { EventEmitter } = require('@aiox-ray/instrumentation');
const { v4: uuidv4 } = require('uuid');

const emitter = new EventEmitter();
```

### 2. Emit on Activation

```javascript
// Before @dev begins processing
const executionId = uuidv4();

emitter.emit('agent.started', {
  agent_id: 'dev',
  execution_id: executionId,
  input: taskDescription,
});
```

### 3. Emit on Completion

```javascript
// After @dev completes (success or error)
emitter.emit('agent.finished', {
  agent_id: 'dev',
  execution_id: executionId,
  status: 'success', // or 'error', 'partial'
  output: result,
  duration_ms: elapsedTime,
});
```

### 4. Error Handling

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

## Extending for Other Agents

The same pattern applies to @qa, @architect agents:

```javascript
// Story 1.2: Extend to @qa and @architect
const emitter = new EventEmitter();

// For @qa agent
emitter.emit('agent.started', {
  agent_id: 'qa', // Change agent_id
  execution_id: uuidv4(),
  input: testInput,
});

// For @architect agent
emitter.emit('agent.started', {
  agent_id: 'architect', // Change agent_id
  execution_id: uuidv4(),
  input: designTask,
});
```

## Troubleshooting

### Events not being delivered

1. **Check Collector is running:** `curl http://localhost:3001/health`
2. **Check token:** Verify `COLLECTOR_TOKEN` is set correctly
3. **Enable debug:** Set `debug: true` when creating emitter
4. **Check logs:** Look for "[EventEmitter]" messages

### High event loss

1. **Collector unavailable:** Events are retried 3x then dropped
2. **Invalid events:** Check schema validation errors in logs
3. **Network issues:** Verify network connectivity to collector

### Performance impact

If overhead exceeds 1%:

1. **Profile with Story 1.6:** Formal performance benchmarking
2. **Check queue depth:** Use `getQueueLength()` to monitor
3. **Async delivery:** Ensure `emit()` returns immediately
4. **Token validation:** Check that token lookup isn't blocking

## Documentation

- [Event Schema](./docs/event-schema.md)
- [Integration Guide](./docs/integration-guide.md)
- [API Reference](./docs/api-reference.md)

## Related Stories

- **Story 1.1:** Implement Instrumentation Hooks in @dev Agent
- **Story 1.2:** Extend Instrumentation to @qa and @architect Agents
- **Story 1.3:** Implement Skill Execution Event Capture
- **Story 1.4:** Build Collector Service & PostgreSQL Storage
- **Story 1.5:** Implement Data Sanitization & Security
- **Story 1.6:** Performance Testing & Overhead Validation

---

*Last Updated: 2026-03-13*
*AIOX-Ray Instrumentation Module v0.1.0*
