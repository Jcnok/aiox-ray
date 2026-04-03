const { v4: uuidv4 } = require('uuid');
const https = require('https');
const http = require('http');

/**
 * EventEmitter - Non-blocking event emission to Collector service
 *
 * Features:
 * - Synchronous queue (emit returns immediately)
 * - Asynchronous delivery to Collector
 * - Exponential backoff retry (100ms, 200ms, 400ms)
 * - Local in-memory queue for failed events
 * - Bearer token authentication
 * - Debug logging
 */
class EventEmitter {
  constructor(options = {}) {
    this.collectorUrl = options.collectorUrl || process.env.COLLECTOR_URL || 'http://localhost:3001';
    this.token = options.token || process.env.COLLECTOR_TOKEN;
    this.queue = []; // Local queue for events
    this.processing = false;
    this.debug = options.debug !== false; // Default true for debugging

    // Retry strategy: [100ms, 200ms, 400ms]
    this.retryDelays = [100, 200, 400];
  }

  /**
   * Configure collector endpoint
   */
  setCollectorUrl(url) {
    this.collectorUrl = url;
    this._log(`Collector URL set to: ${url}`);
  }

  /**
   * Configure Bearer token for authentication
   */
  setToken(token) {
    this.token = token;
    this._log(`Bearer token configured`);
  }

  /**
   * Emit event - synchronous queuing, asynchronous delivery
   * @param {string} eventType - e.g., "agent.started", "agent.finished"
   * @param {object} payload - Event payload data
   */
  emit(eventType, payload = {}) {
    const instrumentationFlag = String(process.env.INSTRUMENTATION_ENABLED || '').toLowerCase();
    if (instrumentationFlag === 'false' || instrumentationFlag === '0') {
      return;
    }

    const event = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      ...payload,
      // Ensure execution_id if not provided
      execution_id: payload.execution_id || uuidv4(),
    };

    // Validate event structure
    this._validateEvent(event);

    // Queue event (synchronous)
    this.queue.push(event);
    this._log(`Event queued: ${eventType} (queue size: ${this.queue.length})`);

    // Start async processing if not already running
    if (!this.processing) {
      setImmediate(() => this._processQueue());
    }
  }

  /**
   * Process queue asynchronously (non-blocking)
   * @private
   */
  async _processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      await this._sendEvent(event);
    }

    this.processing = false;
  }

  /**
   * Send event to Collector with retry logic
   * @private
   */
  async _sendEvent(event, attemptNumber = 0) {
    try {
      this._log(`Sending event (attempt ${attemptNumber + 1}): ${event.event_type}`);

      const response = await this._makeRequest(event);

      if (response.statusCode === 201 || response.statusCode === 200) {
        this._log(`✓ Event sent successfully: ${event.event_type}`);
        return;
      }

      // Handle non-2xx responses with retry
      if (attemptNumber < this.retryDelays.length) {
        const delay = this.retryDelays[attemptNumber];
        this._log(`⚠ Retry: ${event.event_type} (status ${response.statusCode}, delay ${delay}ms)`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._sendEvent(event, attemptNumber + 1);
      }

      // Max retries exceeded
      this._log(`✗ Event dropped after 3 retries: ${event.event_type}`);
    } catch (error) {
      // Network error or other failure
      if (attemptNumber < this.retryDelays.length) {
        const delay = this.retryDelays[attemptNumber];
        this._log(`⚠ Retry (error): ${event.event_type} - ${error.message} (delay ${delay}ms)`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._sendEvent(event, attemptNumber + 1);
      }

      // Max retries exceeded
      this._log(`✗ Event dropped after 3 retries: ${event.event_type} - ${error.message}`);
    }
  }

  /**
   * Make HTTP POST request to Collector
   * @private
   */
  _makeRequest(event) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.collectorUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const payload = JSON.stringify(event);

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: '/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 5000,
      };

      // Add Bearer token if configured
      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data,
            headers: res.headers,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Validate event structure against schema
   * @private
   */
  _validateEvent(event) {
    const required = ['event_type', 'agent_id', 'timestamp', 'execution_id'];

    for (const field of required) {
      if (!event[field]) {
        throw new Error(`Event validation failed: missing required field '${field}'`);
      }
    }

    // Validate types
    if (typeof event.event_type !== 'string') {
      throw new Error('Event validation failed: event_type must be string');
    }

    if (typeof event.agent_id !== 'string') {
      throw new Error('Event validation failed: agent_id must be string');
    }

    // Validate ISO 8601 timestamp
    const timestamp = new Date(event.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Event validation failed: timestamp must be valid ISO 8601');
    }

    // Validate UUID format (simple check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(event.execution_id)) {
      throw new Error('Event validation failed: execution_id must be valid UUID');
    }
  }

  /**
   * Debug logging
   * @private
   */
  _log(message) {
    if (this.debug) {
      console.log(`[EventEmitter] ${message}`);
    }
  }

  /**
   * Get queue length (for testing)
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Flush queue (for testing)
   */
  async flush() {
    await this._processQueue();

    // Wait a bit for in-flight requests to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.processing) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }
}

module.exports = { EventEmitter };
