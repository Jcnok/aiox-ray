import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Valid enum values
export const VALID_EVENT_TYPES = [
  'agent.started',
  'agent.finished',
  'error.occurred',
  'recovery.attempt',
  'skill.executed',
  'chain_of_thought',
] as const;

export const VALID_AGENT_IDS = ['dev', 'qa', 'architect', 'orchestrator'] as const;

export type EventType = typeof VALID_EVENT_TYPES[number];
export type AgentId = typeof VALID_AGENT_IDS[number];

export interface Event {
  event_type: EventType;
  agent_id: AgentId;
  timestamp: string;
  execution_id: string;
  duration_ms?: number;
  payload?: Record<string, any>;
  version?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  event?: Event;
}

/**
 * Validate ISO 8601 timestamp format
 */
export function isValidISO8601(timestamp: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!iso8601Regex.test(timestamp)) {
    return false;
  }
  // Verify it can be parsed as a date
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Validate UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate event schema
 * Returns ValidationResult with errors if validation fails
 */
export function validateEvent(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Request body must be a valid JSON object' }],
    };
  }

  // Validate event_type
  if (!data.event_type) {
    errors.push({ field: 'event_type', message: 'event_type is required' });
  } else if (typeof data.event_type !== 'string') {
    errors.push({ field: 'event_type', message: 'event_type must be a string' });
  } else if (!VALID_EVENT_TYPES.includes(data.event_type)) {
    errors.push({
      field: 'event_type',
      message: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
    });
  }

  // Validate agent_id
  if (!data.agent_id) {
    errors.push({ field: 'agent_id', message: 'agent_id is required' });
  } else if (typeof data.agent_id !== 'string') {
    errors.push({ field: 'agent_id', message: 'agent_id must be a string' });
  } else if (!VALID_AGENT_IDS.includes(data.agent_id)) {
    errors.push({
      field: 'agent_id',
      message: `agent_id must be one of: ${VALID_AGENT_IDS.join(', ')}`,
    });
  }

  // Validate timestamp
  if (!data.timestamp) {
    errors.push({ field: 'timestamp', message: 'timestamp is required' });
  } else if (typeof data.timestamp !== 'string') {
    errors.push({ field: 'timestamp', message: 'timestamp must be a string' });
  } else if (!isValidISO8601(data.timestamp)) {
    errors.push({ field: 'timestamp', message: 'timestamp must be in ISO 8601 format' });
  }

  // Validate execution_id
  if (!data.execution_id) {
    errors.push({ field: 'execution_id', message: 'execution_id is required' });
  } else if (typeof data.execution_id !== 'string') {
    errors.push({ field: 'execution_id', message: 'execution_id must be a string' });
  } else if (!isValidUUID(data.execution_id)) {
    errors.push({ field: 'execution_id', message: 'execution_id must be a valid UUID' });
  }

  // Validate optional fields
  if (data.duration_ms !== undefined && (typeof data.duration_ms !== 'number' || data.duration_ms < 0)) {
    errors.push({ field: 'duration_ms', message: 'duration_ms must be a non-negative number' });
  }

  if (data.payload !== undefined && typeof data.payload !== 'object') {
    errors.push({ field: 'payload', message: 'payload must be an object' });
  }

  if (data.version !== undefined && typeof data.version !== 'string') {
    errors.push({ field: 'version', message: 'version must be a string' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Return validated event
  const event: Event = {
    event_type: data.event_type,
    agent_id: data.agent_id,
    timestamp: data.timestamp,
    execution_id: data.execution_id,
    duration_ms: data.duration_ms,
    payload: data.payload,
    version: data.version,
  };

  return { valid: true, errors: [], event };
}
