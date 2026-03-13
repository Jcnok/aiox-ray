# Event Collector Service

> Node.js/Express service that receives, validates, and persists instrumentation events to PostgreSQL

## Overview

The Collector Service is the **hub** of the AIOX Ray observability system. It accepts events from all AIOX agents and infrastructure components, validates them against a strict schema, and persists them to PostgreSQL for querying and analysis.

## Features

- ✅ **HTTP Event Ingestion** — POST /events with Bearer token authentication
- ✅ **Schema Validation** — Strict validation of event type, agent_id, timestamp, execution_id
- ✅ **PostgreSQL Persistence** — JSONB payload storage with efficient indexing
- ✅ **Query API** — GET /events with filtering (agent_id, event_type, time range) and pagination
- ✅ **Performance** — Handles 100+ events/sec, queries <100ms with proper indices
- ✅ **Security** — Bearer token auth, CORS, helmet security headers, rate limiting
- ✅ **Reliability** — Graceful error handling, structured logging, connection pooling
- ✅ **30-Day Retention** — Automatic cleanup of old events

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Environment Variables

Create a `.env` file in the collector directory:

```env
# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aiox_ray

# Authentication
COLLECTOR_TOKEN=your-secret-bearer-token-here
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

The server will start on the configured PORT (default: 3001) and run migrations automatically.

## API Endpoints

### Health Check

```bash
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

### Create Event

```bash
POST /events
Authorization: Bearer {COLLECTOR_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "event_type": "agent.started",
  "agent_id": "dev",
  "timestamp": "2026-03-13T10:00:00Z",
  "execution_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_ms": 100,
  "payload": {
    "story_id": "1.4",
    "action": "started"
  },
  "version": "1.0.0"
}
```

**Response (201 Created):**
```json
{
  "event_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "accepted"
}
```

**Error Response (400 Validation Error):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Event validation failed",
    "details": [
      {
        "field": "event_type",
        "message": "event_type must be one of: agent.started, agent.finished, error.occurred, recovery.attempt, skill.executed, chain_of_thought"
      }
    ],
    "timestamp": "2026-03-13T10:00:00.123Z"
  }
}
```

### Query Events

```bash
GET /events?agent_id=dev&start_time=2026-03-13T00:00Z&end_time=2026-03-13T23:59Z&limit=100&offset=0
Authorization: Bearer {COLLECTOR_TOKEN}
```

**Query Parameters:**
- `agent_id` (optional) — Filter by agent ID (dev, qa, architect, orchestrator)
- `event_type` (optional) — Filter by event type
- `execution_id` (optional) — Filter by execution ID
- `start_time` (optional) — Filter by start timestamp (ISO 8601)
- `end_time` (optional) — Filter by end timestamp (ISO 8601)
- `limit` (optional, default: 100, max: 1000) — Results per page
- `offset` (optional, default: 0) — Pagination offset

**Response (200 OK):**
```json
{
  "events": [
    {
      "event_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "event_type": "agent.started",
      "agent_id": "dev",
      "execution_id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-03-13T10:00:00Z",
      "duration_ms": 100,
      "payload": { "story_id": "1.4" },
      "version": "1.0.0",
      "created_at": "2026-03-13T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

## Event Types

Valid `event_type` values:

- `agent.started` — Agent execution started
- `agent.finished` — Agent execution completed
- `error.occurred` — Error during execution
- `recovery.attempt` — Attempted recovery from error
- `skill.executed` — Skill/task execution
- `chain_of_thought` — Chain-of-thought reasoning step

## Validation Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `event_type` | string | ✅ | Must be one of valid event types |
| `agent_id` | string | ✅ | Must be: dev, qa, architect, orchestrator |
| `timestamp` | string | ✅ | ISO 8601 format (e.g., 2026-03-13T10:00:00Z) |
| `execution_id` | string | ✅ | UUID v4 format |
| `duration_ms` | number | ❌ | Non-negative integer |
| `payload` | object | ❌ | Any valid JSON object |
| `version` | string | ❌ | Semver format recommended |

## Database Schema

### events table
```sql
event_id UUID PRIMARY KEY
event_type VARCHAR(50) NOT NULL
agent_id VARCHAR(50) NOT NULL
execution_id UUID NOT NULL
timestamp TIMESTAMP NOT NULL
duration_ms INTEGER
payload JSONB
version VARCHAR(20)
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
```

### Indices
- `(agent_id, timestamp DESC)` — Agent-specific queries
- `(execution_id)` — Execution queries
- `(event_type)` — Event type filtering
- `(timestamp DESC)` — Time-based ordering
- `(created_at)` — 30-day retention cleanup

## Development

### Build

```bash
# Compile TypeScript to JavaScript
npm run build

# Output: ./dist/
```

### Testing

```bash
# Run all integration tests
npm test

# Watch mode
npm run test:watch
```

### Linting

```bash
# Check code style
npm run lint

# Fix issues
npm run lint:fix
```

## Docker Deployment

### Build Image

```bash
docker build -t aiox-ray-collector:latest .
```

### Run Container

```bash
docker run -d \
  --name collector \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@db:5432/aiox_ray \
  -e COLLECTOR_TOKEN=your-token \
  -e NODE_ENV=production \
  aiox-ray-collector:latest
```

### Docker Compose (Local Dev)

```bash
docker-compose up -d
```

This starts:
- PostgreSQL 14 (port 5432)
- Collector Service (port 3001)

## Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Event ingestion rate | 100+ events/sec | 150+ events/sec |
| Query response time | <100ms | 25-50ms |
| Connection pool | 5-20 connections | 3-8 active |
| Database retention | 30 days | Configurable |

## Error Handling

All errors return JSON with consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "timestamp": "2026-03-13T10:00:00.123Z"
  }
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_AUTH` | 401 | Authorization header missing |
| `INVALID_TOKEN` | 403 | Invalid bearer token |
| `VALIDATION_ERROR` | 400 | Event schema validation failed |
| `INVALID_PAGINATION` | 400 | Invalid limit/offset |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_SERVER_ERROR` | 500 | Server error (details not leaked) |

## Logging

Logs are structured JSON format using Pino:

```json
{
  "level": 30,
  "time": "2026-03-13T10:00:00.123Z",
  "pid": 1234,
  "hostname": "collector-1",
  "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message": "Event created successfully",
  "eventId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "eventType": "agent.started",
  "agentId": "dev"
}
```

Configure log level with `LOG_LEVEL` environment variable:
- `debug` — Verbose logging
- `info` — Standard logging (default)
- `warn` — Warning and errors only
- `error` — Errors only

## Monitoring & Health

The service provides:

- `GET /health` — Health check endpoint
- Structured logging with requestId for tracing
- Connection pool status in logs
- Error tracking with full context

## Scaling

For production deployments:

1. **Horizontal Scaling** — Run multiple collector instances behind a load balancer
2. **Database Optimization** — Partition events by month, archive old data
3. **Monitoring** — Track event ingestion rate, query latency, error rates
4. **Retention Policy** — Adjust 30-day retention based on storage needs

## Troubleshooting

### "Connection refused" to database
- Check DATABASE_URL is correct
- Verify PostgreSQL is running and accessible
- Ensure network connectivity

### "COLLECTOR_TOKEN is required"
- Set COLLECTOR_TOKEN environment variable
- Check .env file is loaded correctly

### High query latency
- Verify indices are created (check pg_indexes)
- Monitor active connections (max 20)
- Consider partitioning large event tables

### Memory usage increasing
- Check for connection leaks (monitor pg_stat_activity)
- Verify connections are being released
- Check for accumulated JSONB payloads

## Contributing

1. Create feature branch
2. Add tests for new functionality
3. Run `npm run lint` and `npm test`
4. Submit PR with description

## License

MIT
