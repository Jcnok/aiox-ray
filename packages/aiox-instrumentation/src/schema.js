/**
 * Event Schema Validator
 * Validates event structure against AIOX-Ray event schema
 */

class SchemaValidator {
  /**
   * Validate event object
   * @param {object} event - Event to validate
   * @throws {Error} if validation fails
   */
  static validateEvent(event) {
    // Check required fields
    const required = ['event_type', 'agent_id', 'timestamp', 'execution_id'];
    for (const field of required) {
      if (event[field] === undefined || event[field] === null) {
        throw new Error(`Schema validation failed: missing required field '${field}'`);
      }
    }

    // Validate field types
    this._validateEventType(event.event_type);
    this._validateAgentId(event.agent_id);
    this._validateTimestamp(event.timestamp);
    this._validateExecutionId(event.execution_id);
  }

  /**
   * Validate event_type field
   * @private
   */
  static _validateEventType(eventType) {
    if (typeof eventType !== 'string') {
      throw new Error('Schema validation failed: event_type must be string');
    }

    const validTypes = [
      'agent.started',
      'agent.finished',
      'skill.executed',
      'error.occurred',
      'recovery.attempt',
      'chain_of_thought',
    ];

    if (!validTypes.includes(eventType)) {
      throw new Error(
        `Schema validation failed: event_type '${eventType}' not in allowed values: ${validTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate agent_id field
   * @private
   */
  static _validateAgentId(agentId) {
    if (typeof agentId !== 'string') {
      throw new Error('Schema validation failed: agent_id must be string');
    }

    const validAgents = ['dev', 'qa', 'architect', 'orchestrator'];

    if (!validAgents.includes(agentId)) {
      throw new Error(
        `Schema validation failed: agent_id '${agentId}' not in allowed values: ${validAgents.join(', ')}`
      );
    }
  }

  /**
   * Validate timestamp field (ISO 8601)
   * @private
   */
  static _validateTimestamp(timestamp) {
    if (typeof timestamp !== 'string') {
      throw new Error('Schema validation failed: timestamp must be string');
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Schema validation failed: timestamp '${timestamp}' must be valid ISO 8601`);
    }

    // Verify it's in ISO 8601 format (basic check)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) {
      throw new Error(
        `Schema validation failed: timestamp '${timestamp}' must be ISO 8601 format (YYYY-MM-DDTHH:mm:ss...)`
      );
    }
  }

  /**
   * Validate execution_id field (UUID format)
   * @private
   */
  static _validateExecutionId(executionId) {
    if (typeof executionId !== 'string') {
      throw new Error('Schema validation failed: execution_id must be string');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(executionId)) {
      throw new Error(
        `Schema validation failed: execution_id '${executionId}' must be valid UUID format (v4)`
      );
    }
  }

  /**
   * Validate optional fields commonly used in events
   * @private
   */
  static validateOptionalFields(event) {
    if (event.duration_ms !== undefined && typeof event.duration_ms !== 'number') {
      throw new Error('Schema validation failed: duration_ms must be number');
    }

    if (event.status !== undefined) {
      const validStatuses = ['success', 'error', 'partial', 'timeout', 'skipped'];
      if (!validStatuses.includes(event.status)) {
        throw new Error(
          `Schema validation failed: status must be one of: ${validStatuses.join(', ')}`
        );
      }
    }

    if (event.payload !== undefined && typeof event.payload !== 'object') {
      throw new Error('Schema validation failed: payload must be object');
    }
  }
}

module.exports = { SchemaValidator };
