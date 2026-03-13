/**
 * AIOX-Ray Instrumentation Module
 *
 * Exports:
 * - EventEmitter: Core event emission engine
 * - SchemaValidator: Event schema validation
 * - SkillHook: Skill execution event wrapper
 * - ParameterSanitizer: Sensitive parameter filtering
 * - Agent hooks: Reference implementations for @dev, @qa, @architect
 */

const { EventEmitter } = require('./event-emitter');
const { SchemaValidator } = require('./schema');
const { SkillHook } = require('./skill-hook');
const { ParameterSanitizer } = require('./sanitizer');
const { initializeDevAgentInstrumentation, executeDevAgentWithInstrumentation } = require('./dev-agent-hook');
const { initializeQAAgentInstrumentation, executeQAAgentWithInstrumentation } = require('./qa-agent-hook');
const { initializeArchitectAgentInstrumentation, executeArchitectAgentWithInstrumentation } = require('./architect-agent-hook');

module.exports = {
  EventEmitter,
  SchemaValidator,
  SkillHook,
  ParameterSanitizer,
  initializeDevAgentInstrumentation,
  executeDevAgentWithInstrumentation,
  initializeQAAgentInstrumentation,
  executeQAAgentWithInstrumentation,
  initializeArchitectAgentInstrumentation,
  executeArchitectAgentWithInstrumentation,
};
