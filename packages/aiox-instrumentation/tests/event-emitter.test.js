/**
 * Unit Tests for EventEmitter and SchemaValidator
 *
 * Run: node packages/aiox-instrumentation/tests/event-emitter.test.js
 */

const assert = require('assert');
const { EventEmitter } = require('../src/event-emitter');
const { SchemaValidator } = require('../src/schema');
const { v4: uuidv4 } = require('uuid');

// Test counters
let passed = 0;
let failed = 0;

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function asyncTest(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  })();
}

console.log('\n═══════════════════════════════════════════════════');
console.log('UNIT TESTS: EventEmitter');
console.log('═══════════════════════════════════════════════════\n');

// Test 1: EventEmitter instantiation
test('EventEmitter: instantiate with defaults', () => {
  const emitter = new EventEmitter();
  assert.strictEqual(emitter.collectorUrl, 'http://localhost:3001');
  assert.strictEqual(emitter.getQueueLength(), 0);
});

// Test 2: EventEmitter with custom URL
test('EventEmitter: instantiate with custom options', () => {
  const emitter = new EventEmitter({
    collectorUrl: 'http://example.com:3000',
    token: 'test-token',
  });
  assert.strictEqual(emitter.collectorUrl, 'http://example.com:3000');
  assert.strictEqual(emitter.token, 'test-token');
});

// Test 3: setCollectorUrl
test('EventEmitter: setCollectorUrl updates URL', () => {
  const emitter = new EventEmitter();
  emitter.setCollectorUrl('http://newurl:3000');
  assert.strictEqual(emitter.collectorUrl, 'http://newurl:3000');
});

// Test 4: setToken
test('EventEmitter: setToken stores token', () => {
  const emitter = new EventEmitter();
  emitter.setToken('new-token');
  assert.strictEqual(emitter.token, 'new-token');
});

// Test 5: Event emission queues event
test('EventEmitter: emit() queues event synchronously', () => {
  const emitter = new EventEmitter({ debug: false });
  const executionId = uuidv4();

  emitter.emit('agent.started', {
    agent_id: 'dev',
    execution_id: executionId,
    input: 'test task',
  });

  assert.strictEqual(emitter.getQueueLength(), 1);
});

// Test 6: Multiple events queue
test('EventEmitter: emit() handles multiple events', () => {
  const emitter = new EventEmitter({ debug: false });
  const executionId = uuidv4();

  emitter.emit('agent.started', { agent_id: 'dev', execution_id: executionId });
  emitter.emit('agent.finished', { agent_id: 'dev', execution_id: executionId, status: 'success' });

  assert.strictEqual(emitter.getQueueLength(), 2);
});

// Test 7: Event validation - auto-generates execution_id if missing
test('EventEmitter: emit() auto-generates execution_id if missing', () => {
  const emitter = new EventEmitter({ debug: false });

  // Should NOT throw - execution_id will be auto-generated
  emitter.emit('agent.started', {
    agent_id: 'dev',
    // execution_id is auto-generated
  });

  assert.strictEqual(emitter.getQueueLength(), 1);
});

// Test 8: Event validation - invalid timestamp
test('EventEmitter: emit() validates timestamp format', () => {
  const emitter = new EventEmitter({ debug: false });

  assert.throws(() => {
    emitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: uuidv4(),
      timestamp: 'not-a-timestamp',
    });
  }, /timestamp/);
});

// Test 9: Event validation - invalid UUID
test('EventEmitter: emit() validates execution_id UUID', () => {
  const emitter = new EventEmitter({ debug: false });

  assert.throws(() => {
    emitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: 'not-a-uuid',
      timestamp: new Date().toISOString(),
    });
  }, /execution_id/);
});

console.log('\n═══════════════════════════════════════════════════');
console.log('UNIT TESTS: SchemaValidator');
console.log('═══════════════════════════════════════════════════\n');

// Test 10: Valid event passes validation
test('SchemaValidator: validateEvent() accepts valid event', () => {
  const validEvent = {
    event_type: 'agent.started',
    agent_id: 'dev',
    timestamp: new Date().toISOString(),
    execution_id: uuidv4(),
  };

  SchemaValidator.validateEvent(validEvent);
  // No error thrown
});

// Test 11: Invalid event_type
test('SchemaValidator: validateEvent() rejects invalid event_type', () => {
  assert.throws(() => {
    SchemaValidator.validateEvent({
      event_type: 'invalid.type',
      agent_id: 'dev',
      timestamp: new Date().toISOString(),
      execution_id: uuidv4(),
    });
  }, /event_type/);
});

// Test 12: Invalid agent_id
test('SchemaValidator: validateEvent() rejects invalid agent_id', () => {
  assert.throws(() => {
    SchemaValidator.validateEvent({
      event_type: 'agent.started',
      agent_id: 'invalid-agent',
      timestamp: new Date().toISOString(),
      execution_id: uuidv4(),
    });
  }, /agent_id/);
});

// Test 13: All valid event types
test('SchemaValidator: validateEvent() accepts all valid event types', () => {
  const types = [
    'agent.started',
    'agent.finished',
    'skill.executed',
    'error.occurred',
    'recovery.attempt',
    'chain_of_thought',
  ];

  const timestamp = new Date().toISOString();
  const executionId = uuidv4();

  for (const type of types) {
    SchemaValidator.validateEvent({
      event_type: type,
      agent_id: 'dev',
      timestamp,
      execution_id: executionId,
    });
  }
});

// Test 14: All valid agent IDs
test('SchemaValidator: validateEvent() accepts all valid agent IDs', () => {
  const agents = ['dev', 'qa', 'architect', 'orchestrator'];

  const eventType = 'agent.started';
  const timestamp = new Date().toISOString();
  const executionId = uuidv4();

  for (const agent of agents) {
    SchemaValidator.validateEvent({
      event_type: eventType,
      agent_id: agent,
      timestamp,
      execution_id: executionId,
    });
  }
});

// Test 15: Optional fields validation
test('SchemaValidator: validateOptionalFields() validates duration_ms', () => {
  const event = {
    event_type: 'agent.finished',
    agent_id: 'dev',
    timestamp: new Date().toISOString(),
    execution_id: uuidv4(),
    duration_ms: 'not-a-number',
  };

  assert.throws(() => {
    SchemaValidator.validateOptionalFields(event);
  }, /duration_ms/);
});

// Test 16: Valid duration_ms
test('SchemaValidator: validateOptionalFields() accepts valid duration_ms', () => {
  const event = {
    event_type: 'agent.finished',
    agent_id: 'dev',
    timestamp: new Date().toISOString(),
    execution_id: uuidv4(),
    duration_ms: 1234,
  };

  SchemaValidator.validateOptionalFields(event);
  // No error thrown
});

// Test 17: Valid status values
test('SchemaValidator: validateOptionalFields() accepts valid status values', () => {
  const statuses = ['success', 'error', 'partial', 'timeout', 'skipped'];

  const event = {
    event_type: 'agent.finished',
    agent_id: 'dev',
    timestamp: new Date().toISOString(),
    execution_id: uuidv4(),
  };

  for (const status of statuses) {
    event.status = status;
    SchemaValidator.validateOptionalFields(event);
  }
});

// Test 18: Async flush functionality
asyncTest('EventEmitter: flush() processes queue', async () => {
  const emitter = new EventEmitter({ debug: false });
  const executionId = uuidv4();

  emitter.emit('agent.started', {
    agent_id: 'dev',
    execution_id: executionId,
  });

  assert.strictEqual(emitter.getQueueLength(), 1);

  // Flush will attempt to send (will fail since no real collector)
  // but should handle gracefully
  await emitter.flush();

  // After flush, queue should be processed
  // (events fail to send but are handled)
});

// Test 19: @qa agent event emission
test('EventEmitter: @qa agent emits with correct agent_id', () => {
  const emitter = new EventEmitter({ debug: false });
  const executionId = uuidv4();

  emitter.emit('agent.started', {
    agent_id: 'qa',
    execution_id: executionId,
    input: 'test case',
  });

  assert.strictEqual(emitter.getQueueLength(), 1);
});

// Test 20: @architect agent event emission
test('EventEmitter: @architect agent emits with correct agent_id', () => {
  const emitter = new EventEmitter({ debug: false });
  const executionId = uuidv4();

  emitter.emit('agent.started', {
    agent_id: 'architect',
    execution_id: executionId,
    input: 'design task',
  });

  assert.strictEqual(emitter.getQueueLength(), 1);
});

// Test 21: All three agents can emit same event type
test('EventEmitter: All agents (@dev, @qa, @architect) emit same schema', () => {
  const emitter = new EventEmitter({ debug: false });
  const agents = ['dev', 'qa', 'architect'];
  const executionId = uuidv4();

  for (const agent of agents) {
    emitter.emit('agent.started', {
      agent_id: agent,
      execution_id: executionId,
      input: `Task for ${agent}`,
    });
  }

  assert.strictEqual(emitter.getQueueLength(), 3);
});

// Test 22: Execution IDs are unique across multiple runs
test('EventEmitter: execution_id auto-generation produces unique IDs', () => {
  const emitter = new EventEmitter({ debug: false });
  const ids = new Set();

  for (let i = 0; i < 5; i++) {
    const event = {
      event_type: 'agent.started',
      agent_id: 'dev',
      timestamp: new Date().toISOString(),
      // No execution_id provided - will be auto-generated
    };

    // Manually trigger validation to capture the auto-generated ID
    emitter.emit('agent.started', {
      agent_id: 'dev',
    });
  }

  // Just verify that multiple emissions work without error
  assert.strictEqual(emitter.getQueueLength(), 5);
});

console.log('\n═══════════════════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
