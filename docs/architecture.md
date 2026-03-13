# AIOX-Ray Fullstack Architecture Document

**Version:** 1.0
**Date:** 2026-03-13
**Author:** Aria (Architect)
**Status:** Ready for Implementation

---

## Introduction

This document outlines the complete fullstack architecture for AIOX-Ray, the meta-observability system for the AIOX framework. It covers instrumentation in the CLI, backend collection and storage, frontend visualization, and the autonomous auditor agent. This unified approach ensures consistency across all layers and serves as the single source of truth for AI-driven fullstack development.

AIOX-Ray is a **greenfield project** — no starter template or existing codebase to integrate with.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-13 | 1.0 | Initial architecture - Full-stack design covering CLI, collector, dashboard, and auditor | Aria |

---

## High Level Architecture

### Technical Summary

AIOX-Ray is a distributed observability system designed to instrument AIOX CLI for event emission, collect events in a centralized PostgreSQL database, and analyze patterns through both a React-based web dashboard and an intelligent @auditor agent. The architecture prioritizes **low-overhead CLI instrumentation** (<5% performance impact) via asynchronous event streaming, a **lightweight Node.js/Express collector** that normalizes and persists events, and a **responsive React dashboard** consuming events via Server-Sent Events for real-time visualization. The system achieves CLI-First philosophy by making the dashboard a secondary layer, with all critical observability accessible via CLI queries and reports.

### Platform and Infrastructure Choice

**Selected Platform: Vercel + Supabase (with fallback to self-hosted PostgreSQL)**

**Rationale:**
- **Vercel:** Ideal for hosting the React dashboard with serverless backend functions, automatic scaling, and global CDN
- **Supabase:** PostgreSQL with built-in auth and real-time capabilities; or self-hosted PostgreSQL on Docker for simplicity
- **Node.js/Express:** Lightweight, familiar to AIOX ecosystem, easily containerized

**Key Services:**
- Vercel: Dashboard SPA hosting, serverless Functions (optional, for edge processing)
- PostgreSQL: Event storage (Supabase or self-hosted)
- Node.js/Express: Collector service (can be co-located with AIOX CLI or run separately)
- Redis (optional): For event queuing and caching (deferred to post-MVP)

**Deployment Regions:**
- Primary: US-East-1 (Vercel default)
- Database: Single region initially (Supabase default)
- CLI Instrumentation: Distributed globally (embedded in AIOX CLI)

### Repository Structure

**Structure:** Monorepo (AIOX already uses monorepo pattern)

**Monorepo Tool:** npm workspaces (already used by AIOX)

**Package Organization:**
```
aiox-core/                       # Existing AIOX core
├── agents/                       # Add auditor.md here
│   └── auditor.md               # NEW: @auditor agent definition
├── core/
│   └── instrumentation/          # NEW: CLI instrumentation hooks
│       ├── event-emitter.js     # Event emission engine
│       ├── sanitizer.js         # Data sanitization logic
│       └── transport.js         # HTTP transport to collector
│
packages/                         # Existing AIOX packages
├── aiox-instrumentation/         # NEW: CLI instrumentation package
│   ├── src/
│   │   ├── hooks/               # Integration hooks for agents
│   │   ├── events/              # Event schema definitions
│   │   └── index.js
│   └── package.json
│
squads/                          # Existing AIOX squads
└── aiox-ray/                    # NEW: Dedicated squad for project
    ├── collector/               # Express backend service
    │   ├── src/
    │   │   ├── routes/          # API endpoints
    │   │   ├── controllers/
    │   │   ├── services/
    │   │   ├── db/              # Database layer
    │   │   └── index.js
    │   ├── tests/
    │   └── package.json
    │
    ├── dashboard/               # React frontend
    │   ├── src/
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── services/
    │   │   ├── stores/          # State management
    │   │   └── App.tsx
    │   ├── public/
    │   └── package.json
    │
    └── docs/                    # Project-specific docs
        ├── API_SPEC.md
        └── DEPLOYMENT.md
```

### High Level Architecture Diagram

```mermaid
graph TB
    CLI[AIOX CLI<br/>with Instrumentation]
    Events["Event Stream<br/>(JSON)"]
    Collector["Collector Service<br/>(Node.js/Express)"]
    DB["PostgreSQL<br/>Event Storage"]
    Dashboard["React Dashboard<br/>(Vercel)"]
    Auditor["@auditor Agent<br/>(CLI-based)"]
    SSE["SSE Stream<br/>(Real-time)"]
    API["REST API<br/>(Query)"]

    CLI -->|Emit Events| Events
    Events -->|HTTP POST /events| Collector
    Collector -->|Normalize & Store| DB
    DB -->|Query| Dashboard
    DB -->|Query| Auditor
    Dashboard -->|SSE /events/stream| SSE
    Auditor -->|REST GET /events| API
    CLI -->|*analyze| Auditor
    Auditor -->|Display Results| CLI
```

### Architectural Patterns

- **Event-Driven Architecture:** CLI emits structured events; Collector subscribes; Dashboard and Auditor consume data from persistence layer
  - _Rationale:_ Decouples agents from observability, enables asynchronous processing, supports future integrations (webhooks, webhooks)

- **Microservices (Loose Coupling):** Instrumentation, Collector, and Dashboard are independent services with well-defined interfaces
  - _Rationale:_ Allows independent scaling and testing; CLI instrumentation remains lightweight; Collector can run in isolation

- **Asynchronous Messaging:** Event emission is fire-and-forget; failure to send doesn't block agent
  - _Rationale:_ Achieves <5% overhead by preventing network blocking; events queued locally if collector unavailable

- **Repository Pattern:** Data access abstraction layer isolates database queries from business logic
  - _Rationale:_ Enables testing without database; supports future migration to different database

- **API Gateway Pattern (implicit):** Collector API provides single entry point for event ingestion and queries
  - _Rationale:_ Centralized authentication, rate limiting, monitoring, and audit logging

- **Real-time Streaming (SSE):** Dashboard subscribes to live event stream without polling
  - _Rationale:_ Reduces latency, enables "live" monitoring; simpler than WebSockets for MVP

- **Agent-Centric Analysis:** @auditor is a full AIOX agent, not a separate service
  - _Rationale:_ Reuses agent framework, benefits from agent prompting and memory layer; follows AIOX philosophy

---

## Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3+ | Type-safe client code | Type safety for complex dashboard state |
| **Frontend Framework** | React | 18.2+ | UI library | Familiar to AIOX ecosystem; strong ecosystem |
| **UI Component Library** | Recharts + Tailwind CSS | Latest | Charts and styling | Recharts for time-series/flow graphs; Tailwind for responsive design |
| **State Management** | React Context + Zustand | Latest | Frontend state | Lightweight; Zustand for complex state; Context for prop drilling avoidance |
| **Backend Language** | Node.js | 18+ | Server runtime | JavaScript/TypeScript for full-stack consistency |
| **Backend Framework** | Express.js | 4.18+ | HTTP server | Lightweight, familiar, excellent middleware ecosystem |
| **API Style** | REST + OpenAPI 3.0 | 3.0 | API specification | RESTful for simplicity; OpenAPI for documentation |
| **Database** | PostgreSQL | 14+ | Event persistence | JSONB support for flexible event payloads; robust, proven |
| **Cache** | Node.js in-memory (Redis future) | - | Event queuing and caching | In-memory for MVP; Redis added in post-MVP for distributed caching |
| **File Storage** | Local filesystem (AWS S3 future) | - | Report storage | Local for MVP; S3 for scaling |
| **Authentication** | Bearer Token (JWT future) | - | API security | Bearer token for MVP (simple); JWT for stateless scaling |
| **Frontend Testing** | Vitest + React Testing Library | Latest | Unit and component tests | Vitest (fast), React Testing Library (user-centric) |
| **Backend Testing** | Jest + Supertest | Latest | Unit and integration tests | Jest (standard), Supertest for HTTP testing |
| **E2E Testing** | Playwright | Latest | Full-stack tests | Modern, fast, cross-browser |
| **Build Tool** | Vite (frontend) + esbuild (backend) | Latest | Bundle optimization | Vite for fast dev/build; esbuild for backend |
| **Bundler** | Rollup (frontend) | Latest | Bundle splitting | Automatic code splitting for dashboard |
| **IaC Tool** | Docker Compose (dev) + GitHub Actions (CI/CD) | - | Infrastructure | Docker for local dev; GitHub Actions for CI/CD |
| **CI/CD** | GitHub Actions | - | Continuous integration | Native GitHub integration; free for open-source |
| **Monitoring** | Custom logging + Sentry (future) | - | Error tracking | Structured logging for MVP; Sentry for post-MVP |
| **Logging** | Pino (structured JSON logs) | Latest | Application logging | JSON output for easy parsing and aggregation |
| **CSS Framework** | Tailwind CSS | 3.3+ | Utility-first styling | Responsive, performant, minimal bundle |

---

## Data Models

### Event (Core Model)

**Purpose:** Represents a single observable occurrence during agent execution (agent start, skill execution, error, etc.)

**Key Attributes:**
- `event_id`: UUID - Unique identifier for the event
- `event_type`: string (enum) - Type of event (agent.started, agent.finished, error.occurred, recovery.attempt, skill.executed, chain_of_thought)
- `agent_id`: string - ID of the agent emitting the event (@dev, @qa, @architect, @orchestrator)
- `execution_id`: UUID - Unique ID linking related events from same execution
- `timestamp`: ISO 8601 - When the event occurred
- `duration_ms`: number (optional) - Duration for events that measure time
- `payload`: JSONB - Event-specific data (flexible schema)
- `version`: string - Event schema version for compatibility

**TypeScript Interface:**
```typescript
interface Event {
  event_id: string; // UUID
  event_type: 'agent.started' | 'agent.finished' | 'error.occurred' | 'recovery.attempt' | 'skill.executed' | 'chain_of_thought';
  agent_id: 'dev' | 'qa' | 'architect' | 'orchestrator';
  execution_id: string; // UUID
  timestamp: string; // ISO 8601
  duration_ms?: number;
  payload: Record<string, any>; // Flexible JSON
  version: string;
}
```

**Relationships:**
- One-to-many: Execution → Events (multiple events per execution)
- One-to-many: Agent → Events (multiple events per agent)
- Links to: CoTSegment (if event_type === 'chain_of_thought')

---

### Execution (Aggregate Root)

**Purpose:** Represents a complete agent execution session, grouping related events

**Key Attributes:**
- `execution_id`: UUID - Unique identifier
- `agent_id`: string - Primary agent executing
- `status`: enum (in_progress, success, error, partial) - Execution outcome
- `started_at`: timestamp
- `finished_at`: timestamp (nullable if in_progress)
- `duration_ms`: number (calculated)
- `input`: JSONB - Input data to agent
- `output`: JSONB - Output from agent (nullable if in_progress)
- `error`: JSONB (optional) - Error details if status === error

**Relationships:**
- One-to-many: Execution → Events (all events with same execution_id)

---

### CoTSegment (Chain of Thought)

**Purpose:** Represents a milestone marker in agent reasoning (captured at 10% sampling rate)

**Key Attributes:**
- `cot_id`: UUID
- `execution_id`: UUID - Links to parent execution
- `milestone`: string - Marker text ("Analisando o problema", "Decisão de implementação", etc.)
- `timestamp`: timestamp
- `order`: integer - Sequence within execution
- `context`: JSONB - Supporting data (optional)

**Relationships:**
- Many-to-one: CoTSegments → Execution

---

### Agent (Metadata)

**Purpose:** Metadata about each instrumented agent

**Key Attributes:**
- `agent_id`: string (primary key)
- `agent_name`: string (human-readable)
- `version`: string - AIOX version instrumented
- `last_seen`: timestamp

---

### DailyMetrics (Aggregated)

**Purpose:** Pre-aggregated metrics for performance (queries don't scan 30 days of raw events)

**Key Attributes:**
- `date`: date
- `agent_id`: string
- `execution_count`: integer
- `avg_duration_ms`: float
- `error_count`: integer
- `error_rate`: float (percent)
- `p95_duration_ms`: float

**Relationships:**
- One per (date, agent_id) pair
- Built nightly via scheduled aggregation job

---

## API Specification

### REST API — Event Collection & Querying

```yaml
openapi: 3.0.0
info:
  title: AIOX-Ray Collector API
  version: 1.0.0
  description: Event collection and querying API for AIOX observability system

servers:
  - url: http://localhost:3001
    description: Local development
  - url: https://collector.aiox-ray.example.com
    description: Production

components:
  schemas:
    Event:
      type: object
      required: [event_type, agent_id, timestamp, execution_id]
      properties:
        event_id:
          type: string
          format: uuid
        event_type:
          type: string
          enum: [agent.started, agent.finished, error.occurred, recovery.attempt, skill.executed, chain_of_thought]
        agent_id:
          type: string
          enum: [dev, qa, architect, orchestrator]
        execution_id:
          type: string
          format: uuid
        timestamp:
          type: string
          format: date-time
        duration_ms:
          type: integer
          nullable: true
        payload:
          type: object
          additionalProperties: true
        version:
          type: string
          default: "1.0"

    ApiError:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
              additionalProperties: true
            timestamp:
              type: string
              format: date-time
            request_id:
              type: string
              format: uuid

paths:
  /events:
    post:
      summary: Submit an event
      tags: [Events]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Event'
      responses:
        '201':
          description: Event accepted
          content:
            application/json:
              schema:
                type: object
                properties:
                  event_id:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [accepted, queued]
        '400':
          description: Invalid event
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
        '429':
          description: Rate limited
        '500':
          description: Server error

    get:
      summary: Query events with filters
      tags: [Events]
      parameters:
        - name: agent_id
          in: query
          schema:
            type: string
          description: Filter by agent
        - name: event_type
          in: query
          schema:
            type: string
          description: Filter by event type
        - name: execution_id
          in: query
          schema:
            type: string
          description: Filter by execution
        - name: start_time
          in: query
          schema:
            type: string
            format: date-time
          description: Start of time range
        - name: end_time
          in: query
          schema:
            type: string
            format: date-time
          description: End of time range
        - name: limit
          in: query
          schema:
            type: integer
            default: 100
            maximum: 1000
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Events matching query
          content:
            application/json:
              schema:
                type: object
                properties:
                  events:
                    type: array
                    items:
                      $ref: '#/components/schemas/Event'
                  total:
                    type: integer
                  limit:
                    type: integer
                  offset:
                    type: integer

  /events/stream:
    get:
      summary: Server-Sent Events stream for real-time updates
      tags: [Events]
      responses:
        '200':
          description: SSE stream established
          content:
            text/event-stream:
              schema:
                type: string
                example: "event: agent.finished\ndata: {...}\n\n"
```

---

## Components

### 1. CLI Instrumentation (`aiox-instrumentation` package)

**Responsibility:** Emit structured events from AIOX CLI agents (@dev, @qa, @architect, @orchestrator) without blocking execution

**Key Interfaces:**
- `registerInstrumentationHook(agent_id, eventEmitter)` - Called by each agent at startup
- `emitEvent(eventType, payload)` - Non-blocking event emission
- `sanitizePayload(payload)` - Remove secrets before emission

**Dependencies:**
- Node.js EventEmitter
- Fetch API for HTTP (built-in Node 18+)

**Technology Stack:**
- Node.js + TypeScript
- Async/await for non-blocking transport
- Local file queue for retry (if collector unavailable)

---

### 2. Collector Service (`squads/aiox-ray/collector`)

**Responsibility:** Receive events via HTTP, validate, sanitize, normalize, and persist to PostgreSQL

**Key Interfaces:**
- `POST /events` - Accept events from CLI
- `GET /events` - Query events with filters
- `GET /events/stream` - SSE stream for real-time
- `Internal: aggregateMetrics()` - Nightly aggregation job

**Dependencies:**
- PostgreSQL database
- Event validation schema

**Technology Stack:**
- Express.js (HTTP server)
- Pino (structured logging)
- pg (PostgreSQL client)
- Express middleware: cors, helmet, rate-limit

---

### 3. Dashboard (`squads/aiox-ray/dashboard`)

**Responsibility:** Visualize real-time and historical events with interactive UI

**Key Interfaces:**
- Connect to Collector SSE stream (`/events/stream`)
- Query Collector for historical data (`GET /events?start_time=...`)
- Display metrics, timeline, flow graph, drill-down

**Dependencies:**
- Collector API
- PostgreSQL (via Collector)

**Technology Stack:**
- React 18 + TypeScript
- Zustand (state management)
- Recharts (charting)
- Tailwind CSS (styling)
- Vite (build tool)

---

### 4. Auditor Agent (`@auditor`)

**Responsibility:** Analyze event patterns and generate improvement suggestions

**Key Interfaces:**
- `*analyze --period=24h` - On-demand analysis
- `*daily-report` - Generate daily report
- Internal: Query Collector API, read agent prompts

**Dependencies:**
- Collector API (`GET /events`)
- Agent definition files (read-only)
- Memory layer (for storing insights)

**Technology Stack:**
- AIOX agent framework
- Integration with @auditor persona/commands

---

## External APIs

**No external APIs required for MVP.** (Collector runs locally or on internal infrastructure.)

**Future (post-MVP):** Slack integration for reports, GitHub API for issue creation.

---

## Core Workflows

### Workflow 1: Event Emission (Non-blocking)

```mermaid
sequenceDiagram
    participant Agent as @dev Agent
    participant Emitter as Event Emitter
    participant Queue as Local Queue
    participant Collector as Collector API
    participant DB as PostgreSQL

    Agent->>Emitter: emitEvent({type, payload})
    activate Emitter
    Emitter->>Emitter: Sanitize payload (remove secrets)
    Emitter->>Queue: Queue event (async, fire-and-forget)
    Emitter-->>Agent: Return immediately (non-blocking)
    deactivate Emitter

    Note over Queue: Background worker thread
    Queue->>Collector: POST /events (with retry)
    Collector->>Collector: Validate event schema
    Collector->>DB: INSERT into events table
    Note over DB: Events now queryable
```

### Workflow 2: Real-time Dashboard Display

```mermaid
sequenceDiagram
    participant User as Developer
    participant Dashboard as React Dashboard
    participant Collector as Collector API
    participant DB as PostgreSQL

    User->>Dashboard: Open dashboard
    Dashboard->>Collector: GET /events/stream (SSE)
    Collector-->>Dashboard: Establish SSE connection

    Note over Collector: Agent emits event elsewhere
    Collector->>DB: INSERT event
    Collector->>Dashboard: Send event via SSE
    Dashboard->>Dashboard: Update real-time display
```

### Workflow 3: Historical Analysis (Drill-down)

```mermaid
sequenceDiagram
    participant User as Developer
    participant Dashboard as React Dashboard
    participant Collector as Collector API
    participant DB as PostgreSQL

    User->>Dashboard: Select time range (2026-03-13, 10:00-15:00)
    Dashboard->>Collector: GET /events?start_time=...&end_time=...
    Collector->>DB: SELECT * FROM events WHERE timestamp IN range
    DB-->>Collector: Return events
    Collector-->>Dashboard: JSON response
    Dashboard->>Dashboard: Render Timeline + Flow Graph

    User->>Dashboard: Click execution node
    Dashboard->>Dashboard: Filter events by execution_id
    Dashboard->>Dashboard: Display CoT, logs, ADE steps
```

### Workflow 4: Auditor Analysis

```mermaid
sequenceDiagram
    participant User as Developer
    participant CLI as AIOX CLI
    participant Auditor as @auditor Agent
    participant Collector as Collector API
    participant DB as PostgreSQL
    participant PromptFiles as Agent Prompt Files

    User->>CLI: *analyze --period=24h
    CLI->>Auditor: Activate @auditor with command
    Auditor->>Collector: GET /events?agent_id=dev&start_time=...
    Collector->>DB: Query events
    DB-->>Auditor: Return 50 @dev executions from past 24h

    Auditor->>Auditor: Analyze patterns (errors, durations)
    Auditor->>PromptFiles: Read @dev prompt
    Auditor->>Auditor: Correlate errors with prompt ambiguities

    Auditor->>Auditor: Generate suggestions
    Auditor-->>CLI: Display plain-language recommendations
```

---

## Database Schema

### PostgreSQL DDL

```sql
-- Events table (partitioned by timestamp for 30-day retention)
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    agent_id VARCHAR(20) NOT NULL,
    execution_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    payload JSONB NOT NULL DEFAULT '{}',
    version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_agent_timestamp (agent_id, timestamp DESC),
    INDEX idx_execution_id (execution_id),
    INDEX idx_event_type (event_type),
    INDEX idx_timestamp (timestamp DESC)
);

-- Partitions for retention (30 days = ~4 partitions)
CREATE TABLE events_2026_03 PARTITION OF events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Executions table (aggregate view)
CREATE TABLE executions (
    execution_id UUID PRIMARY KEY,
    agent_id VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    duration_ms INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (COALESCE(finished_at, CURRENT_TIMESTAMP) - started_at)) * 1000
    ) STORED,
    input JSONB,
    output JSONB,
    error JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_agent_started (agent_id, started_at DESC),
    INDEX idx_status (status)
);

-- CoT segments table
CREATE TABLE cot_segments (
    cot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(execution_id),
    milestone VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    order_index INTEGER NOT NULL,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES executions(execution_id),
    INDEX idx_execution_order (execution_id, order_index)
);

-- Agents metadata table
CREATE TABLE agents (
    agent_id VARCHAR(20) PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL,
    version VARCHAR(20),
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily metrics (aggregated for performance)
CREATE TABLE daily_metrics (
    date DATE NOT NULL,
    agent_id VARCHAR(20) NOT NULL,
    execution_count INTEGER DEFAULT 0,
    avg_duration_ms FLOAT,
    error_count INTEGER DEFAULT 0,
    error_rate FLOAT,
    p95_duration_ms FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, agent_id),
    INDEX idx_date (date DESC)
);

-- Cleanup job: Delete events older than 30 days
CREATE PROCEDURE cleanup_old_events()
LANGUAGE SQL
AS $$
DELETE FROM events
WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
$$;

-- Run cleanup daily at 2 AM UTC via pg_cron
SELECT cron.schedule('cleanup-old-events', '0 2 * * *', 'CALL cleanup_old_events()');
```

---

## Frontend Architecture

### Component Organization

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── Dashboard.tsx         # Main container
│   │   ├── MetricsCards.tsx      # Overview cards
│   │   ├── TimelineChart.tsx     # Gantt-style timeline
│   │   ├── FlowGraph.tsx         # Interactive flow diagram
│   │   └── DrilldownPane.tsx     # Execution detail view
│   │
│   ├── Timeline/
│   │   ├── Timeline.tsx          # Timeline container
│   │   ├── TimelineBar.tsx       # Single execution bar
│   │   └── GanttChart.tsx        # Full Gantt rendering
│   │
│   ├── FlowGraph/
│   │   ├── FlowGraph.tsx         # Flow container
│   │   ├── Node.tsx              # Graph node
│   │   └── Edge.tsx              # Connection between nodes
│   │
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   │
│   └── Common/
│       ├── Loading.tsx
│       ├── ErrorBoundary.tsx
│       └── Filters.tsx
│
├── pages/
│   ├── DashboardPage.tsx         # Main dashboard route
│   ├── HistoricalPage.tsx        # Historical analysis route
│   └── AuditReportsPage.tsx      # Audit reports display
│
├── stores/
│   ├── eventStore.ts             # Zustand event state
│   ├── filterStore.ts            # Filter state
│   └── uiStore.ts                # UI state (selectedExecution, etc.)
│
├── services/
│   ├── api.ts                    # Fetch wrapper
│   ├── eventClient.ts            # Collector API queries
│   └── sseClient.ts              # SSE stream management
│
├── hooks/
│   ├── useEventStream.ts         # Hook for SSE subscription
│   ├── useEvents.ts              # Hook for event queries
│   └── useFilters.ts             # Filter management hook
│
├── utils/
│   ├── format.ts                 # Date/time formatting
│   ├── chart.ts                  # Chart rendering helpers
│   └── colors.ts                 # Color schemes (status indicators)
│
├── App.tsx                        # Root component
├── index.tsx                      # Entry point
└── styles/
    ├── globals.css               # Global Tailwind
    └── components.css            # Component styles
```

### State Management Architecture

```typescript
// stores/eventStore.ts (Zustand)
interface EventStore {
  events: Event[];
  executions: Map<string, Execution>;
  selectedExecution: Execution | null;
  filters: FilterState;

  // Actions
  addEvent: (event: Event) => void;
  setEvents: (events: Event[]) => void;
  selectExecution: (execution_id: string) => void;
  setFilters: (filters: FilterState) => void;
  clearEvents: () => void;
}

// filters/
- agent_id: string[] (multiselect)
- start_time: Date
- end_time: Date
- event_type: string[] (multiselect)
- status: 'success' | 'error' | 'in_progress' (multiselect)

// Computed state (derived from events)
- Metrics: execution_count, avg_duration, error_rate
- Timeline: events sorted by timestamp with duration calculations
- FlowGraph: execution relationships derived from execution_id linkage
```

### API Client Setup

```typescript
// services/eventClient.ts
class EventClient {
  constructor(baseUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async queryEvents(filters: FilterQuery): Promise<EventPage> {
    const params = new URLSearchParams();
    // Build query from filters
    const response = await fetch(`${this.baseUrl}/events?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  subscribeToStream(onEvent: (event: Event) => void): EventSource {
    const eventSource = new EventSource(
      `${this.baseUrl}/events/stream`,
      { withCredentials: true }
    );
    eventSource.addEventListener('event', (e) => {
      const event = JSON.parse(e.data);
      onEvent(event);
    });
    return eventSource;
  }
}
```

---

## Backend Architecture

### Collector Service Structure

```
collector/
├── src/
│   ├── index.ts                  # Express app setup
│   ├── config.ts                 # Configuration management
│   │
│   ├── routes/
│   │   ├── events.ts             # /events endpoints
│   │   ├── health.ts             # Health check
│   │   └── metrics.ts            # Metrics endpoint
│   │
│   ├── controllers/
│   │   └── eventsController.ts   # Business logic
│   │
│   ├── services/
│   │   ├── eventService.ts       # Event processing
│   │   ├── validationService.ts  # Schema validation
│   │   └── aggregationService.ts # Metrics aggregation
│   │
│   ├── db/
│   │   ├── client.ts             # PostgreSQL connection pool
│   │   ├── queries.ts            # SQL query builders
│   │   └── migrations.ts         # Schema migrations
│   │
│   ├── middleware/
│   │   ├── auth.ts               # Bearer token auth
│   │   ├── errorHandler.ts       # Error handling
│   │   ├── requestLogger.ts      # Pino request logging
│   │   └── rateLimit.ts          # Rate limiting
│   │
│   ├── utils/
│   │   ├── logger.ts             # Pino logger instance
│   │   ├── crypto.ts             # Token generation
│   │   └── time.ts               # Timestamp utilities
│   │
│   ├── jobs/
│   │   ├── aggregationJob.ts     # Nightly metric aggregation
│   │   └── cleanupJob.ts         # 30-day retention cleanup
│   │
│   └── types/
│       └── index.ts              # TypeScript types
│
├── tests/
│   ├── integration/
│   │   ├── events.test.ts
│   │   └── db.test.ts
│   └── unit/
│       └── validation.test.ts
│
├── docker-compose.yml            # Local PostgreSQL for dev
├── package.json
└── tsconfig.json
```

### Collector Express Server

```typescript
// src/index.ts
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { eventRouter } from './routes/events';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security
app.use(helmet());
app.use(express.json({ limit: '10kb' })); // Prevent large payloads

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000            // 1000 requests per minute
});
app.use('/events', limiter);

// Logging
app.use(requestLogger);

// Routes
app.use('/events', authMiddleware, eventRouter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Collector running on port ${PORT}`));
```

### Authentication Strategy

```typescript
// middleware/auth.ts (Bearer Token - MVP)
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: { code: 'AUTH_MISSING', message: 'Missing token' } });
  }

  // MVP: Simple shared token (production: JWT with expiry)
  if (token !== process.env.COLLECTOR_TOKEN) {
    return res.status(403).json({ error: { code: 'AUTH_INVALID', message: 'Invalid token' } });
  }

  next();
};

// Future: JWT with roles
// const decoded = jwt.verify(token, secret);
// req.user = decoded;
```

---

## Unified Project Structure (Monorepo)

```
aiox/
├── .github/
│   └── workflows/
│       ├── ci.yaml                # Run tests + lint on push
│       └── deploy.yaml            # Deploy dashboard to Vercel
│
├── .aiox-core/
│   ├── agents/
│   │   └── auditor.md             # NEW: @auditor agent
│   └── core/
│       └── instrumentation/       # NEW: CLI hooks
│           ├── event-emitter.js
│           ├── sanitizer.js
│           └── transport.js
│
├── packages/
│   └── aiox-instrumentation/      # NEW: CLI instrumentation package
│       ├── src/
│       │   ├── hooks/
│       │   ├── events/
│       │   └── index.js
│       ├── tests/
│       └── package.json
│
├── squads/
│   └── aiox-ray/                  # NEW: AIOX-Ray squad
│       ├── collector/
│       │   ├── src/
│       │   ├── tests/
│       │   ├── docker-compose.yml
│       │   └── package.json
│       │
│       ├── dashboard/
│       │   ├── src/
│       │   ├── public/
│       │   ├── tests/
│       │   └── package.json
│       │
│       └── docs/
│           ├── API_SPEC.md
│           └── DEPLOYMENT.md
│
├── docs/
│   ├── prd.md                     # Product Requirements (Morgan)
│   └── architecture.md            # This document (Aria)
│
├── .env.example
├── package.json                   # Root workspace
├── pnpm-workspace.yaml            # Monorepo config
└── README.md
```

---

## Development Workflow

### Local Setup

**Prerequisites:**
```bash
# Node 18+
node --version

# PostgreSQL client
psql --version

# Docker (optional, for PostgreSQL)
docker --version
```

**Initial Setup:**
```bash
# Clone and install
git clone <aiox-repo>
cd aiox
npm install

# Setup environment
cp .env.example .env
# Edit .env: set COLLECTOR_TOKEN, DATABASE_URL, etc.

# Start PostgreSQL (via Docker)
docker-compose up -d

# Run migrations
npm run -w squads/aiox-ray/collector migrate

# Seed test data (optional)
npm run -w squads/aiox-ray/collector seed
```

**Development Commands:**
```bash
# Start all services (collector + dashboard)
npm run dev

# Start collector only
npm run -w squads/aiox-ray/collector dev

# Start dashboard only
npm run -w squads/aiox-ray/dashboard dev

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Environment Configuration

**Frontend (.env.local or vite.config.ts):**
```
VITE_API_URL=http://localhost:3001
VITE_SSE_TIMEOUT=30000
VITE_CACHE_TTL=60000
```

**Backend (.env):**
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/aiox_ray
COLLECTOR_TOKEN=dev-token-12345
LOG_LEVEL=debug
NODE_ENV=development
```

**Shared:**
```
AIOX_VERSION=1.0.0
PROJECT_NAME=AIOX-Ray
```

---

## Deployment Architecture

### Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel (recommended) or AWS CloudFront
- **Build Command:** `npm run -w squads/aiox-ray/dashboard build`
- **Output Directory:** `dist/`
- **CDN/Edge:** Vercel's global edge network (automatic)

**Backend Deployment:**
- **Platform:** Docker container on EC2 / Railway / Render (self-hosted)
- **Build Command:** `npm run -w squads/aiox-ray/collector build`
- **Deployment Method:** Docker push to registry + container orchestration

**Database Deployment:**
- **Platform:** Managed PostgreSQL (Supabase, RDS) or self-hosted on Docker
- **Backup Strategy:** Automated daily snapshots

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  deploy-dashboard:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-collector:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/build-push-action@v4
        with:
          context: ./squads/aiox-ray/collector
          push: true
          tags: ${{ secrets.DOCKER_REGISTRY }}/aiox-ray-collector:latest
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|---|---|---|---|
| **Development** | http://localhost:5173 | http://localhost:3001 | Local development |
| **Staging** | https://dashboard-staging.vercel.app | https://api-staging.example.com | Pre-production testing |
| **Production** | https://aiox-ray.example.com | https://collector.example.com | Live environment |

---

## Security and Performance

### Security Requirements

**Frontend Security:**
- **CSP Headers:** `default-src 'self'; script-src 'self' 'nonce-xxx'; style-src 'self' 'unsafe-inline'`
- **XSS Prevention:** HTML escaping via React (automatic); no `dangerouslySetInnerHTML`
- **Secure Storage:** No secrets in localStorage; use httpOnly cookies for tokens (future)

**Backend Security:**
- **Input Validation:** JSON schema validation on all POST bodies
- **Rate Limiting:** 1000 events/minute per IP (configurable)
- **CORS Policy:** `Access-Control-Allow-Origin: https://aiox-ray.example.com` (restrictive)

**Authentication Security:**
- **Token Storage:** Bearer token in `Authorization` header (MVP); JWT with expiry (future)
- **Session Management:** Stateless (no session store); token revocation via blocklist (future)
- **Password Policy:** N/A for MVP (token-based auth)

### Performance Optimization

**Frontend Performance:**
- **Bundle Size Target:** <300KB (gzipped)
- **Loading Strategy:** Code splitting by route; lazy load charts
- **Caching Strategy:** Browser cache for static assets (1 year); API responses cached 5 minutes

**Backend Performance:**
- **Response Time Target:** <100ms p95 for most queries
- **Database Optimization:** Indices on (agent_id, timestamp); partition by date
- **Caching Strategy:** In-memory cache for agents metadata; daily metrics pre-computed

---

## Testing Strategy

### Testing Pyramid

```
                 E2E Tests (Playwright)
                 (1-2 critical workflows)
                /                          \
         Integration Tests (Jest + Supertest)
            (API endpoints, DB flows)
           /                                \
      Frontend Unit           Backend Unit
      (React Testing Library)  (Jest)
      (Components, Hooks)      (Services, Queries)
```

### Test Organization

**Frontend Tests:**
```
dashboard/tests/
├── unit/
│   ├── components/
│   │   ├── Dashboard.test.tsx
│   │   ├── TimelineChart.test.tsx
│   │   └── FlowGraph.test.tsx
│   ├── hooks/
│   │   └── useEventStream.test.ts
│   └── stores/
│       └── eventStore.test.ts
└── integration/
    └── dashboard-flow.test.ts
```

**Backend Tests:**
```
collector/tests/
├── unit/
│   ├── validation.test.ts
│   └── sanitizer.test.ts
└── integration/
    ├── events-api.test.ts
    └── db.test.ts
```

**E2E Tests:**
```
tests/e2e/
├── event-emission.spec.ts      # CLI → Collector → Dashboard
└── auditor-analysis.spec.ts    # Auditor → Analysis
```

### Test Examples

**Frontend Component Test:**
```typescript
// dashboard/tests/unit/components/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';

describe('Dashboard', () => {
  it('displays real-time events', async () => {
    const mockEvent = { event_type: 'agent.finished', agent_id: 'dev' };

    render(<Dashboard />);

    // Simulate SSE event
    fireEvent(new EventSource('...'), 'message', { data: JSON.stringify(mockEvent) });

    await waitFor(() => {
      expect(screen.getByText(/agent.finished/)).toBeInTheDocument();
    });
  });
});
```

**Backend API Test:**
```typescript
// collector/tests/integration/events-api.test.ts
import request from 'supertest';
import { app } from '@/index';

describe('POST /events', () => {
  it('accepts valid events', async () => {
    const event = {
      event_type: 'agent.started',
      agent_id: 'dev',
      execution_id: 'uuid-123',
      timestamp: new Date().toISOString(),
      payload: {}
    };

    const response = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(event);

    expect(response.status).toBe(201);
    expect(response.body.event_id).toBeDefined();
  });

  it('rejects invalid events', async () => {
    const response = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ missing_required_field: true });

    expect(response.status).toBe(400);
  });
});
```

---

## Coding Standards

### Critical Fullstack Rules

- **Type Sharing:** Always define types in `packages/shared/src/types/` and import from there. CLI and Dashboard use same Event/Execution types.

- **API Calls:** Never make direct `fetch()` calls. Use `EventClient` service layer (injected via context).

- **Environment Variables:** Access only through `config.ts` objects, never `process.env` or `import.meta.env` directly.

- **Error Handling:** All API routes must use the standard `errorHandler` middleware. Dashboard must catch fetch errors and display user-friendly messages.

- **State Updates:** Never mutate state directly. Use Zustand actions for backend state, React hooks for local state.

- **Database Queries:** Always use parameterized queries (pg library handles this). Never string interpolate SQL.

- **Secrets:** No API keys, tokens, or credentials in code. Use environment variables with `.env` files (git-ignored).

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| **Components** | PascalCase | - | `Dashboard.tsx` |
| **Hooks** | camelCase + 'use' | - | `useEventStream.ts` |
| **API Routes** | - | kebab-case | `/api/events` |
| **Database Tables** | - | snake_case | `daily_metrics` |
| **Functions** | camelCase | camelCase | `emitEvent()` |
| **Constants** | UPPER_SNAKE | UPPER_SNAKE | `DEFAULT_TIMEOUT` |
| **Types/Interfaces** | PascalCase | PascalCase | `EventPayload` |

---

## Error Handling Strategy

### Error Flow

```mermaid
sequenceDiagram
    participant App as Application Layer
    participant Service as Service Layer
    participant DB as Database

    App->>Service: Call operation
    Service->>DB: Query

    alt Error Occurs
        DB-->>Service: Error/Exception
        Service->>Service: Wrap in AppError
        Service-->>App: Throw AppError
        App->>App: Catch and handle
        App-->>User: Display user-friendly message
    else Success
        DB-->>Service: Result
        Service-->>App: Return data
        App-->>User: Display data
    end
```

### Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;                              // 'VALIDATION_ERROR', 'AUTH_FAILED', 'DB_ERROR'
    message: string;                           // User-friendly message
    details?: Record<string, any>;             // Additional context
    timestamp: string;                         // ISO 8601
    requestId: string;                         // UUID for tracing
  };
}

// Example
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Event payload is invalid",
    "details": {
      "missing_fields": ["execution_id", "timestamp"]
    },
    "timestamp": "2026-03-13T10:30:45Z",
    "requestId": "req-uuid-123"
  }
}
```

### Frontend Error Handling

```typescript
// services/eventClient.ts
class EventClient {
  async queryEvents(filters: FilterQuery): Promise<EventPage> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.error.code,
          errorData.error.message,
          errorData.error.details
        );
      }
      return response.json();
    } catch (error) {
      console.error('Event query failed:', error);
      throw new AppError('Failed to fetch events', { cause: error });
    }
  }
}

// Usage in component
const { data, error, loading } = useEvents(filters);

if (error) {
  return <ErrorAlert message={error.message} />;
}
```

### Backend Error Handling

```typescript
// middleware/errorHandler.ts
export const errorHandler = (err, req, res, next) => {
  const requestId = req.id || generateUUID();

  const response = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  if (err instanceof ValidationError) {
    response.error.details = err.details;
    return res.status(400).json(response);
  }

  if (err instanceof AuthError) {
    return res.status(401).json(response);
  }

  logger.error(response, err);
  return res.status(500).json(response);
};
```

---

## Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** Custom event logging + Sentry (future)
- **Backend Monitoring:** Pino structured logs + DataDog (future)
- **Error Tracking:** Console errors + Sentry (future)
- **Performance Monitoring:** Web Vitals (frontend) + APM (future)

### Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors (uncaught + handled)
- API response times
- User interactions (clicks, filters)

**Backend Metrics:**
- Request rate (events/sec)
- Error rate (4xx, 5xx)
- Response time (p50, p95, p99)
- Database query latency
- Event queue backlog

---

## Checklist & Approval

### Architecture Checklist

✅ **Requirements Coverage:**
- [x] All FR (functional) and NFR (non-functional) from PRD addressed
- [x] <5% instrumentation overhead
- [x] <100ms event ingestion latency
- [x] 30-day retention + indefinite aggregates
- [x] Real-time SSE + historical replay
- [x] @auditor agent for analysis

✅ **System Design:**
- [x] Event schema with JSONB flexibility
- [x] Partition strategy for retention
- [x] Index strategy for query performance
- [x] Asynchronous event emission (non-blocking)
- [x] Component boundaries clear
- [x] Data flow documented

✅ **Technology Stack:**
- [x] PostgreSQL chosen (JSONB support, proven)
- [x] React + Zustand (familiar, lightweight)
- [x] Express.js (lightweight, ecosystem)
- [x] Pino logging (JSON, structured)
- [x] Versions specified for all dependencies

✅ **Testing & Quality:**
- [x] Testing pyramid defined (unit, integration, e2e)
- [x] Error handling strategy unified
- [x] Security measures specified (auth, rate-limit, sanitization)
- [x] Coding standards documented

✅ **Deployment & Operations:**
- [x] Monorepo structure defined
- [x] CI/CD pipeline specified
- [x] Environment strategy (dev, staging, prod)
- [x] Monitoring and observability planned
- [x] Local development setup documented

---

## Next Steps

### For @sm (River - Scrum Master)

1. **Receive approved architecture** + PRD from Morgan
2. **Break Epic 1 stories into detailed tasks:**
   - Story 1.1: Instrumentation hooks (Task 1.1.1, 1.1.2, ...)
   - Task dependencies: US-1 → US-2 → US-3 (sequential)
3. **Define "Definition of Done"** for each task (tests, docs, code review)
4. **Estimate task difficulty** and assign to sprints
5. **Create GitHub issues** with task descriptions

### For @dev (Dex - Implementation)

1. **Read this architecture document** in full
2. **Understand the event schema** and PostgreSQL structure
3. **Review test examples** to understand expected patterns
4. **Begin with Story 1.1** (CLI instrumentation in @dev agent):
   - Implement event emitter hook
   - Register with @dev agent
   - Test <1% overhead (critical)
5. **Work with @qa** on performance testing

### For @architect (Future)

- **Monitoring stack:** Finalize Sentry/DataDog integration
- **Scaling strategy:** Plan for multi-region deployment (post-MVP)
- **Advanced patterns:** Event sourcing, CQRS (if needed for analytics)

---

## Document Status

✅ **Architecture Complete and Ready for Implementation**

**Sign-off:**
- Architecture: Aria (Visionary Architect)
- PRD: Morgan (Product Manager)
- Next Phase: Implementation (@sm + @dev)

**Version History:**
- v1.0: Initial full-stack architecture (2026-03-13)

---

**— Aria, arquitetando o futuro 🏗️**
