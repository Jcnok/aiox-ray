/**
 * Skill Hook - Event emission wrapper for skill execution
 *
 * Wraps skill functions to emit skill.executed events with:
 * - Skill name
 * - Parameters (sanitized)
 * - Duration in milliseconds
 * - Status (success, error, timeout, skipped)
 * - Result summary (first 500 chars)
 */

const { ParameterSanitizer } = require('./sanitizer');

class SkillHook {
  /**
   * Create SkillHook instance
   * @param {object} emitter - EventEmitter instance for event emission
   * @param {object} options - Configuration options
   */
  constructor(emitter, options = {}) {
    this.emitter = emitter;
    this.agentId = options.agentId || 'dev';
    this.executionId = options.executionId;
    this.debug = options.debug !== false;
  }

  /**
   * Wrap a skill function to emit events
   * @param {string} skillName - Unique skill identifier
   * @param {function} skillFunction - The skill function to wrap
   * @returns {function} Wrapped skill function
   */
  wrap(skillName, skillFunction) {
    return async (...args) => {
      const startTime = Date.now();
      let status = 'success';
      let result = null;
      let error = null;

      try {
        // Extract parameters from function arguments
        const parameters = this._extractParameters(skillFunction, args);

        // Execute skill function
        result = await skillFunction(...args);

        return result;
      } catch (err) {
        status = 'error';
        error = err;
        throw err; // Re-throw to preserve error propagation
      } finally {
        // Emit event regardless of success/failure
        const duration = Date.now() - startTime;

        try {
          const parameters = this._extractParameters(skillFunction, args);
          const sanitizedParams = ParameterSanitizer.sanitize(parameters);

          // Build result summary
          const resultSummary = this._buildResultSummary(result, error);

          // Emit skill.executed event
          this.emitter.emit('skill.executed', {
            agent_id: this.agentId,
            execution_id: this.executionId,
            skill_name: skillName,
            parameters: sanitizedParams,
            duration_ms: duration,
            status,
            result_summary: resultSummary,
          });
        } catch (eventError) {
          // Don't let event emission errors interrupt skill execution
          if (this.debug) {
            console.warn(`[SkillHook] Failed to emit skill.executed for ${skillName}:`, eventError.message);
          }
        }
      }
    };
  }

  /**
   * Extract parameters from function arguments
   * @private
   */
  _extractParameters(skillFunction, args) {
    // Try to match arguments with function parameters
    const paramNames = this._getParameterNames(skillFunction);

    const parameters = {};

    for (let i = 0; i < Math.min(paramNames.length, args.length); i++) {
      parameters[paramNames[i]] = args[i];
    }

    return parameters;
  }

  /**
   * Extract parameter names from function
   * @private
   */
  _getParameterNames(fn) {
    const fnStr = fn.toString();

    // Match function parameters (basic regex)
    const match = fnStr.match(/(?:function.*?)?\(([^)]*)\)/) || fnStr.match(/async\s*\(([^)]*)\)/);

    if (!match || !match[1]) {
      return [];
    }

    return match[1]
      .split(',')
      .map((param) => param.trim().split('=')[0]) // Remove default values
      .filter((param) => param.length > 0);
  }

  /**
   * Build result summary from result or error
   * @private
   */
  _buildResultSummary(result, error) {
    if (error) {
      // Use error message as summary
      return ParameterSanitizer.truncate(error.message || String(error), 500);
    }

    if (result === null || result === undefined) {
      return '';
    }

    if (typeof result === 'string') {
      return ParameterSanitizer.truncate(result, 500);
    }

    if (typeof result === 'object') {
      try {
        return ParameterSanitizer.truncate(JSON.stringify(result), 500);
      } catch {
        return '[Unable to serialize result]';
      }
    }

    return ParameterSanitizer.truncate(String(result), 500);
  }
}

module.exports = { SkillHook };
