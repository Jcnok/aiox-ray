/**
 * Integration Tests for SkillHook
 *
 * Tests the complete SkillHook workflow with a mock Collector.
 * Run: node packages/aiox-instrumentation/tests/skill-hook-integration.test.js
 */

const assert = require('assert');
const http = require('http');
const { EventEmitter } = require('../src/event-emitter');
const { SkillHook } = require('../src/skill-hook');
const { v4: uuidv4 } = require('uuid');

let passed = 0;
let failed = 0;
const asyncPromises = [];

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
  const promise = (async () => {
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
  asyncPromises.push(promise);
  return promise;
}

/**
 * Mock Collector Server
 * Accepts skill.executed events via HTTP POST
 */
class MockCollector {
  constructor(port = 3002) {
    this.port = port;
    this.receivedEvents = [];
    this.server = null;
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        if (req.method === 'POST' && (req.url === '/' || req.url === '/events')) {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const event = JSON.parse(body);
              this.receivedEvents.push(event);
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              res.writeHead(400);
              res.end();
            }
          });
        } else if (req.url === '/health') {
          res.writeHead(200);
          res.end('OK');
        } else {
          res.writeHead(404);
          res.end();
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
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('INTEGRATION TESTS: SkillHook');
console.log('═══════════════════════════════════════════════════\n');

// Test 1: Skill execution event delivery to Collector
asyncTest('SkillHook: delivers skill.executed event to mock Collector', async () => {
  const collector = new MockCollector(3002);
  await collector.start();

  const emitter = new EventEmitter({
    collectorUrl: 'http://localhost:3002',
    debug: false,
  });

  const hook = new SkillHook(emitter, { executionId: uuidv4() });

  const skill = async (x, y) => x + y;
  const wrapped = hook.wrap('add', skill);

  const result = await wrapped(2, 3);
  assert.strictEqual(result, 5);

  // Wait for async delivery
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.strictEqual(collector.receivedEvents.length > 0, true);
  const event = collector.receivedEvents[0];
  assert.strictEqual(event.event_type, 'skill.executed');
  assert.strictEqual(event.skill_name, 'add');
  assert.strictEqual(event.status, 'success');

  await collector.stop();
});

// Test 2: Parameter sanitization in delivered event
asyncTest('SkillHook: sanitizes parameters in delivered event', async () => {
  const collector = new MockCollector(3003);
  await collector.start();

  const emitter = new EventEmitter({
    collectorUrl: 'http://localhost:3003',
    debug: false,
  });

  const hook = new SkillHook(emitter);

  const skill = async (api_key, username) => {
    return `User ${username} authenticated`;
  };
  const wrapped = hook.wrap('authenticate', skill);

  await wrapped('secret-key-123', 'alice');

  // Wait for async delivery
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.strictEqual(collector.receivedEvents.length > 0, true);
  const event = collector.receivedEvents[0];
  assert.strictEqual(event.parameters.api_key, '[REDACTED]');
  assert.strictEqual(event.parameters.username, 'alice');

  await collector.stop();
});

// Test 3: Error status in event for failing skills
asyncTest('SkillHook: emits error status for failing skills', async () => {
  const collector = new MockCollector(3004);
  await collector.start();

  const emitter = new EventEmitter({
    collectorUrl: 'http://localhost:3004',
    debug: false,
  });

  const hook = new SkillHook(emitter);

  const skill = async () => {
    throw new Error('Connection timeout');
  };
  const wrapped = hook.wrap('query-database', skill);

  try {
    await wrapped();
  } catch (error) {
    // Expected
  }

  // Wait for async delivery
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.strictEqual(collector.receivedEvents.length > 0, true);
  const event = collector.receivedEvents[0];
  assert.strictEqual(event.status, 'error');
  assert.strictEqual(event.result_summary.includes('timeout'), true);

  await collector.stop();
});

// Test 4: Duration calculation in event
asyncTest('SkillHook: records accurate duration in event', async () => {
  const collector = new MockCollector(3005);
  await collector.start();

  const emitter = new EventEmitter({
    collectorUrl: 'http://localhost:3005',
    debug: false,
  });

  const hook = new SkillHook(emitter);

  const skill = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return 'done';
  };
  const wrapped = hook.wrap('slow-operation', skill);

  await wrapped();

  // Wait for async delivery
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.strictEqual(collector.receivedEvents.length > 0, true);
  const event = collector.receivedEvents[0];
  assert.strictEqual(event.duration_ms >= 50, true);

  await collector.stop();
});

// Test 5: Multiple skills emit separate events
asyncTest('SkillHook: emits separate events for multiple skills', async () => {
  const collector = new MockCollector(3006);
  await collector.start();

  const emitter = new EventEmitter({
    collectorUrl: 'http://localhost:3006',
    debug: false,
  });

  const hook1 = new SkillHook(emitter, { agentId: 'dev' });
  const hook2 = new SkillHook(emitter, { agentId: 'qa' });

  const skill1 = async () => 'result1';
  const skill2 = async () => 'result2';

  const wrapped1 = hook1.wrap('skill1', skill1);
  const wrapped2 = hook2.wrap('skill2', skill2);

  await wrapped1();
  await wrapped2();

  // Wait for async delivery
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.strictEqual(collector.receivedEvents.length >= 2, true);
  const events = collector.receivedEvents.slice(0, 2);
  assert.strictEqual(events[0].skill_name, 'skill1');
  assert.strictEqual(events[1].skill_name, 'skill2');
  assert.strictEqual(events[0].agent_id, 'dev');
  assert.strictEqual(events[1].agent_id, 'qa');

  await collector.stop();
});

console.log('\n═══════════════════════════════════════════════════');
console.log('INTEGRATION TESTS: SkillHook');
console.log('═══════════════════════════════════════════════════\n');

// Wait for all async tests
(async () => {
  await Promise.all(asyncPromises);

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
})();
