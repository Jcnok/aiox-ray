/**
 * DevAgent Instrumentation Hook
 *
 * Example of how to integrate EventEmitter with @dev agent
 * This is a reference implementation for Story 1.1
 *
 * Integration Steps:
 * 1. Import EventEmitter and uuid
 * 2. Create emitter instance at agent initialization
 * 3. Emit 'agent.started' before processing begins
 * 4. Emit 'agent.finished' after processing completes
 */

const { EventEmitter } = require('../src/event-emitter');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize DevAgent instrumentation
 * Call this during @dev agent activation
 */
function initializeDevAgentInstrumentation() {
  const emitter = new EventEmitter({
    collectorUrl: process.env.COLLECTOR_URL || 'http://localhost:3001',
    token: process.env.COLLECTOR_TOKEN,
    debug: process.env.DEBUG === 'true',
  });

  return emitter;
}

/**
 * Wrap DevAgent execution with event emission
 * Call this to emit startup and completion events
 */
async function executeDevAgentWithInstrumentation(emitter, taskInput, executeFn) {
  // Generate unique execution ID for this agent invocation
  const executionId = uuidv4();
  const startTime = Date.now();

  // Emit agent.started event
  try {
    emitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: executionId,
      input: taskInput,
    });
  } catch (error) {
    console.warn('[DevAgent] Failed to emit agent.started event:', error.message);
    // Continue execution even if event emission fails
  }

  let status = 'success';
  let output = null;

  try {
    // Execute agent function
    output = await executeFn();
  } catch (error) {
    status = 'error';
    output = error.message;
  } finally {
    // Calculate execution duration
    const duration = Date.now() - startTime;

    // Emit agent.finished event
    try {
      emitter.emit('agent.finished', {
        agent_id: 'dev',
        execution_id: executionId,
        status,
        output,
        duration_ms: duration,
      });
    } catch (error) {
      console.warn('[DevAgent] Failed to emit agent.finished event:', error.message);
    }
  }

  return {
    status,
    output,
    executionId,
  };
}

/**
 * Example usage
 */
async function exampleUsage() {
  // Initialize emitter
  const emitter = initializeDevAgentInstrumentation();

  // Simulate agent work
  const result = await executeDevAgentWithInstrumentation(
    emitter,
    'Implement Story 1.1',
    async () => {
      // Simulate agent work
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'Story 1.1 implementation complete';
    }
  );

  console.log('Agent execution result:', result);

  // Wait for events to be delivered
  await emitter.flush();
}

module.exports = {
  initializeDevAgentInstrumentation,
  executeDevAgentWithInstrumentation,
};

// Run example if executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}
