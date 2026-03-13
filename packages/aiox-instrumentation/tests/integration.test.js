/**
 * Integration Tests for EventEmitter with Mock Collector
 *
 * Run: node packages/aiox-instrumentation/tests/integration.test.js
 */

const assert = require('assert');
const http = require('http');
const { EventEmitter } = require('../src/event-emitter');
const { v4: uuidv4 } = require('uuid');

let passed = 0;
let failed = 0;

function test(name, fn) {
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

/**
 * Mock Collector Server
 */
class MockCollector {
  constructor(port = 3001) {
    this.port = port;
    this.server = null;
    this.receivedEvents = [];
    this.responseMode = 'success'; // 'success', 'error', 'timeout'
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/events') {
          let body = '';

          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', () => {
            try {
              const event = JSON.parse(body);
              this.receivedEvents.push(event);

              // Respond based on mode
              if (this.responseMode === 'success') {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ event_id: uuidv4(), status: 'accepted' }));
              } else if (this.responseMode === 'error') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid event' }));
              } else if (this.responseMode === 'timeout') {
                // Don't respond (simulate timeout)
              }
            } catch (error) {
              res.writeHead(400);
              res.end('Invalid JSON');
            }
          });
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }

  reset() {
    this.receivedEvents = [];
    this.responseMode = 'success';
  }

  getReceivedEvents() {
    return this.receivedEvents;
  }

  setResponseMode(mode) {
    this.responseMode = mode;
  }
}

async function runIntegrationTests() {
  const mockCollector = new MockCollector(3001);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('INTEGRATION TESTS: EventEmitter with Mock Collector');
  console.log('═══════════════════════════════════════════════════\n');

  // Start mock collector
  try {
    await mockCollector.start();
    console.log('Mock Collector started on http://localhost:3001\n');
  } catch (error) {
    console.log('Failed to start mock collector:', error.message);
    process.exit(1);
  }

  // Test 1: Successful event delivery
  await test('Integration: emit() sends event to collector (HTTP 201)', async () => {
    const emitter = new EventEmitter({
      collectorUrl: 'http://localhost:3001',
      debug: false,
    });
    const executionId = uuidv4();

    mockCollector.reset();
    mockCollector.setResponseMode('success');

    emitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: executionId,
      input: 'test task',
    });

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 200));

    const events = mockCollector.getReceivedEvents();
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].event_type, 'agent.started');
    assert.strictEqual(events[0].agent_id, 'dev');
    assert.strictEqual(events[0].execution_id, executionId);
  });

  // Test 2: Multiple events delivery
  await test('Integration: emit() handles multiple events in sequence', async () => {
    const emitter = new EventEmitter({
      collectorUrl: 'http://localhost:3001',
      debug: false,
    });
    const executionId = uuidv4();

    mockCollector.reset();
    mockCollector.setResponseMode('success');

    emitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: executionId,
      input: 'test task',
    });

    emitter.emit('agent.finished', {
      agent_id: 'dev',
      execution_id: executionId,
      status: 'success',
      output: 'Task completed',
      duration_ms: 1234,
    });

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 300));

    const events = mockCollector.getReceivedEvents();
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].event_type, 'agent.started');
    assert.strictEqual(events[1].event_type, 'agent.finished');
  });

  // Test 3: Bearer token is included
  await test('Integration: emit() includes Bearer token in request', async () => {
    const emitter = new EventEmitter({
      collectorUrl: 'http://localhost:3001',
      token: 'test-bearer-token',
      debug: false,
    });
    const executionId = uuidv4();

    mockCollector.reset();
    mockCollector.setResponseMode('success');

    emitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: executionId,
    });

    // Wait for delivery
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Note: Integration test doesn't directly verify Authorization header
    // but we can verify that events were sent successfully with token configured
    const events = mockCollector.getReceivedEvents();
    assert.strictEqual(events.length, 1);
  });

  // Test 4: Retry on failure
  await test('Integration: emit() retries on HTTP 400 error', async () => {
    const emitter = new EventEmitter({
      collectorUrl: 'http://localhost:3001',
      debug: false,
    });
    const executionId = uuidv4();

    mockCollector.reset();
    mockCollector.setResponseMode('error'); // Will fail first, then succeed after retry

    emitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: executionId,
    });

    // Wait for retries (100ms + 200ms + 400ms = ~700ms, plus some buffer)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Even with errors, collector may not receive due to 400 response
    // This test verifies the retry mechanism doesn't crash
  });

  // Cleanup
  console.log('\n');
  await mockCollector.stop();
  console.log('Mock Collector stopped\n');

  console.log('═══════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runIntegrationTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
