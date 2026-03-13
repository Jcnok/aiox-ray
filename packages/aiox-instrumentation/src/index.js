/**
 * AIOX-Ray Instrumentation Module
 *
 * Exports:
 * - EventEmitter: Core event emission engine
 * - SchemaValidator: Event schema validation
 */

const { EventEmitter } = require('./event-emitter');
const { SchemaValidator } = require('./schema');

module.exports = {
  EventEmitter,
  SchemaValidator,
};
