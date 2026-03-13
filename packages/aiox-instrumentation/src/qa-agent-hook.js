/**
 * QA Agent Instrumentation Hook
 *
 * Example of how to integrate EventEmitter with @qa agent
 * This is a reference implementation for Story 1.2
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
 * Initialize QA Agent instrumentation
 * Call this during @qa agent activation
 */
function initializeQAAgentInstrumentation() {
  const emitter = new EventEmitter({
    collectorUrl: process.env.COLLECTOR_URL || 'http://localhost:3001',
    token: process.env.COLLECTOR_TOKEN,
    debug: process.env.DEBUG === 'true',
  });

  return emitter;
}

/**
 * Wrap QA Agent execution with event emission
 * Call this to emit startup and completion events
 */
async function executeQAAgentWithInstrumentation(emitter, taskInput, executeFn) {
  // Generate unique execution ID for this agent invocation
  const executionId = uuidv4();
  const startTime = Date.now();

  // Emit agent.started event
  try {
    emitter.emit('agent.started', {
      agent_id: 'qa',
      execution_id: executionId,
      input: taskInput,
    });
  } catch (error) {
    console.warn('[QAAgent] Failed to emit agent.started event:', error.message);
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
        agent_id: 'qa',
        execution_id: executionId,
        status,
        output,
        duration_ms: duration,
      });
    } catch (error) {
      console.warn('[QAAgent] Failed to emit agent.finished event:', error.message);
    }
  }

  return {
    status,
    output,
    executionId,
  };
}

module.exports = {
  initializeQAAgentInstrumentation,
  executeQAAgentWithInstrumentation,
};
