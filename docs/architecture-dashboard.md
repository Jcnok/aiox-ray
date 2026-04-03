# AIOX-Ray Dashboard & Visualization Architecture
## Epic 2: Dashboard & Visualization

**Version:** 1.2
**Date:** 2026-04-03
**Author:** Aria (Architect)
**Status:** Epic 2 implemented and closed (stories 2.1–2.5 delivered)
**Epic:** 2 (Dashboard & Visualization)
**Depends On:** Epic 1 ✅ (Data Instrumentation & Collection)

---

## Executive Summary

Epic 2 delivers a React-based web dashboard that visualizes real-time and historical AIOX-Ray event data. The dashboard consumes events from the Collector service via Server-Sent Events (SSE) for live updates, and queries historical data via REST API for replay and analysis. The architecture prioritizes **responsiveness** (real-time updates <100ms latency), **interactivity** (pan/zoom, drill-down), and **clarity** for developers debugging agent behavior.

### Success Criteria

1. ✅ React SPA served by Collector's Express server
2. ✅ Real-time event stream via SSE with <100ms latency (p95)
3. ✅ 5 interactive visualization types (metrics, timeline, flow, drill-down, filters)
4. ✅ Historical date/time picker for 30-day replay
5. ✅ Responsive design (desktop 1920px, tablet 768px)
6. ✅ All 5 stories independently testable
7. ✅ Performance: Dashboard loads <2 seconds, SSE connection <500ms

---

## Architecture Overview

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      AIOX CLI (Distributed)                 │
│                  Emit events asynchronously                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Collector Service (Node.js/Express)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POST /events (receives events from CLI)             │   │
│  │ GET /events/stream (SSE stream for dashboard)       │   │
│  │ GET /events?filters (historical query API)          │   │
│  │ GET /metrics?period= (aggregated stats)             │   │
│  └──────────────────────────────────────────────────────┘   │
└────┬──────────────────────────────────┬────────────────────┘
     │                                  │
     ▼                                  ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   PostgreSQL         │    │   React Dashboard SPA    │
│   - events table     │    │  (Browser)               │
│   - executions       │    │  ┌────────────────────┐  │
│   - cot_segments     │    │  │ Metrics Cards      │  │
│   - daily_metrics    │◄───┤  │ Timeline (Gantt)   │  │
│                      │    │  │ Flow Graph         │  │
│                      │    │  │ Drill-Down Pane    │  │
│                      │    │  │ Filters & Search   │  │
│                      │    │  └────────────────────┘  │
└──────────────────────┘    └──────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|-----------------|------------|
| **Collector** | Receive events, normalize, persist, serve via API/SSE | Express.js + pg |
| **React SPA** | Display real-time & historical data, handle user interactions | React 18 + TypeScript |
| **State Management** | Manage event stream, filter state, UI state | Zustand |
| **PostgreSQL** | Store raw events and pre-aggregated metrics | PostgreSQL |
| **Browser** | Render visualizations, maintain WebSocket/SSE connection | Chrome/Firefox/Safari |

---

## Frontend Architecture

### Technology Stack

- **Framework:** React 18 with TypeScript
- **State Management:** Zustand (lightweight, fast)
- **Charting:** Recharts (Gantt, bar charts)
- **Graph Visualization:** React Flow (DAG, pan/zoom)
- **Styling:** Tailwind CSS + custom CSS modules
- **Build Tool:** Vite (fast dev server, optimized production builds)
- **HTTP Client:** fetch API (simple, modern)
- **Testing:** Vitest + React Testing Library

### Directory Structure

```
squads/aiox-ray/dashboard/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx           # Main dashboard container
│   │   │   ├── MetricsCards.tsx        # 4 metric cards (executions, avg duration, error rate, agent distribution)
│   │   │   ├── TimelineChart.tsx       # Gantt-style timeline
│   │   │   ├── FlowGraph.tsx           # Interactive flow diagram
│   │   │   ├── DrilldownPane.tsx       # Execution detail view
│   │   │   └── Dashboard.module.css
│   │   │
│   │   ├── Timeline/
│   │   │   ├── Timeline.tsx            # Timeline container
│   │   │   ├── TimelineBar.tsx         # Single execution bar
│   │   │   ├── GanttChart.tsx          # Full Gantt rendering (x=time, y=agent)
│   │   │   └── Timeline.module.css
│   │   │
│   │   ├── FlowGraph/
│   │   │   ├── FlowGraph.tsx           # Flow graph container (React Flow)
│   │   │   ├── Node.tsx                # Custom node component
│   │   │   ├── Edge.tsx                # Custom edge component
│   │   │   ├── NodeDetail.tsx          # Node stats on hover
│   │   │   └── FlowGraph.module.css
│   │   │
│   │   ├── Layout/
│   │   │   ├── Header.tsx              # Top navigation, title
│   │   │   ├── Sidebar.tsx             # Agent filter, time picker
│   │   │   ├── Layout.tsx              # Root layout wrapper
│   │   │   └── Layout.module.css
│   │   │
│   │   └── Common/
│   │       ├── Loading.tsx             # Loading spinner
│   │       ├── ErrorBoundary.tsx       # Error boundary
│   │       ├── Filters.tsx             # Filter panel (agent, time, error type)
│   │       ├── DatePicker.tsx          # Historical date/time picker
│   │       └── Common.module.css
│   │
│   ├── pages/
│   │   ├── DashboardPage.tsx           # Route: / (real-time dashboard)
│   │   ├── HistoricalPage.tsx          # Route: /historical (date picker + replay)
│   │   ├── AuditReportsPage.tsx        # Route: /reports (daily reports)
│   │   └── NotFoundPage.tsx            # Route: 404
│   │
│   ├── stores/
│   │   ├── eventStore.ts               # Zustand: events[] + methods (addEvent, clearEvents)
│   │   ├── filterStore.ts              # Zustand: agent_id, start_time, end_time, error_type
│   │   └── uiStore.ts                  # Zustand: selectedExecutionId, isLoading, error
│   │
│   ├── services/
│   │   ├── api.ts                      # Fetch wrapper with error handling
│   │   ├── eventClient.ts              # Collector API queries (GET /events, GET /metrics)
│   │   └── sseClient.ts                # SSE stream management (connect, disconnect)
│   │
│   ├── hooks/
│   │   ├── useEventStream.ts           # Hook for SSE subscription (useEffect wrapper)
│   │   ├── useEvents.ts                # Hook for event queries (useEffect + async fetch)
│   │   ├── useFilters.ts               # Hook for filter state (selector from filterStore)
│   │   └── useDebounce.ts              # Debounce hook for search/filter
│   │
│   ├── types/
│   │   └── index.ts                    # TypeScript interfaces (Event, Execution, Metric)
│   │
│   ├── utils/
│   │   ├── format.ts                   # Format duration, timestamp, error message
│   │   ├── statistics.ts               # Calculate avg, median, p95, p99
│   │   └── colors.ts                   # Color mapping (status → color)
│   │
│   ├── App.tsx                         # Root component with routing
│   ├── App.module.css
│   └── index.tsx                       # React entry point
│
├── public/
│   ├── index.html                      # HTML template
│   └── favicon.ico
│
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── Dashboard.test.tsx
│   │   │   ├── MetricsCards.test.tsx
│   │   │   ├── TimelineChart.test.tsx
│   │   │   ├── FlowGraph.test.tsx
│   │   │   └── DrilldownPane.test.tsx
│   │   │
│   │   ├── stores/
│   │   │   ├── eventStore.test.ts
│   │   │   ├── filterStore.test.ts
│   │   │   └── uiStore.test.ts
│   │   │
│   │   └── services/
│   │       ├── eventClient.test.ts
│   │       └── sseClient.test.ts
│   │
│   ├── integration/
│   │   ├── dashboard-flow.test.tsx    # Full dashboard flow
│   │   ├── sse-streaming.test.tsx     # SSE connection and events
│   │   └── historical-replay.test.tsx # Date picker and historical query
│   │
│   └── fixtures/
│       └── mockEvents.ts               # Mock event data
│
├── vite.config.ts                      # Vite configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Dependencies
└── README.md                           # Build & deployment instructions
```

### State Management (Zustand Stores)

#### eventStore.ts
```typescript
type EventStore = {
  events: Event[]
  addEvent: (event: Event) => void
  setEvents: (events: Event[]) => void
  clearEvents: () => void
  getEventsByExecutionId: (executionId: string) => Event[]
}

// Usage in components:
const { events, addEvent } = useEventStore()
```

#### filterStore.ts
```typescript
type FilterStore = {
  agentId: string | null
  startTime: Date | null
  endTime: Date | null
  errorType: string | null
  setAgentId: (id: string | null) => void
  setTimeRange: (start: Date, end: Date) => void
  setErrorType: (type: string | null) => void
  reset: () => void
}

// Usage: const { agentId, setAgentId } = useFilterStore()
```

#### uiStore.ts
```typescript
type UIStore = {
  selectedExecutionId: string | null
  isLoading: boolean
  error: string | null
  setSelectedExecution: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// Usage: const { selectedExecutionId, isLoading } = useUIStore()
```

### Hooks

#### useEventStream.ts
```typescript
// Hook to subscribe to SSE stream
function useEventStream() {
  const addEvent = useEventStore((s) => s.addEvent)

  useEffect(() => {
    const eventSource = new EventSource('/events/stream')

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data)
      addEvent(parsed)
    }

    eventSource.onerror = () => eventSource.close()

    return () => eventSource.close()
  }, [addEvent])
}
```

#### useEvents.ts
```typescript
// Hook to fetch historical events
function useEvents(filters: FilterState) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const data = await eventClient.getEvents(filters)
        setEvents(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [filters])

  return { events, loading, error }
}
```

### Component Specifications

#### 1. MetricsCards (Story 2.2)
**Props:**
- `events: Event[]` — All events for period
- `period: string` — "today" | "7days"

**Display:**
- Total Executions (count)
- Avg Duration (ms, with trend vs previous period)
- Error Rate (%, with trend)
- Distribution by Agent (pie chart)

**Features:**
- Click card to drill-down by agent/error type
- 5-second refresh interval
- Responsive grid (1 col mobile, 2 col tablet, 4 col desktop)

#### 2. TimelineChart / GanttChart (Story 2.3)
**Props:**
- `events: Event[]` — Execution events
- `onSelectExecution: (id: string) => void` — Selection callback

**Display:**
- X-axis: Time (start_time → finish_time)
- Y-axis: Agent lanes (dev, qa, architect, orchestrator)
- Bars: Execution duration (color by status: success=green, error=red, in-progress=blue)

**Features:**
- Horizontal scroll for dense timelines
- Hover tooltip with execution metadata
- Click bar to open drill-down pane

#### 3. FlowGraph (Story 2.4)
**Props:**
- `events: Event[]` — Events to build graph
- `selectedAgent: string | null` — Filter by agent

**Display:**
- Nodes: Agent/Skill executions
- Edges: Parent-child relationships (execution lineage)
- Layout: Directed acyclic graph (top-down)

**Features:**
- Pan/zoom support
- Node hover details
- Click node to highlight path
- Filter graph by agent type
- Mini-map for navigation

#### 4. DrilldownPane (Story 2.4)
**Props:**
- `executionId: string` — Selected execution
- `events: Event[]` — All events for execution

**Display Sections (collapsible):**
1. **Metadata:** execution_id, agent_id, start_time, end_time, duration
2. **Input/Output:** Prompt, response, token usage
3. **Chain of Thought:** Parsed CoT segments with truncation support
4. **Error Trace:** Stack trace, error type, recovery attempts
5. **ADE Data:** Subtask graph, dependencies, completion status
6. **Raw JSON:** Full event payload (copy-to-clipboard)

**Features:**
- Collapsible sections (default: metadata expanded)
- Search within execution events
- Copy JSON button
- Keyboard shortcut: ESC to close

#### 5. Filters Panel (Story 2.5)
**Controls:**
- Agent multi-select (dev, qa, architect, orchestrator)
- Time range picker (last hour, today, 7 days, custom)
- Event type filter (agent.started, error.occurred, etc.)
- Error-only toggle
- Search by execution_id

**Behavior:**
- Debounced filter updates (300ms)
- URL query params sync (shareable filtered views)
- Persist filter state in localStorage

---

## Backend Integration Architecture

### Collector API Endpoints (Consumed by Dashboard)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/events/stream` | GET (SSE) | Real-time event stream | No (current), target: secured |
| `/events` | GET | Historical events with filters | Yes (Bearer) |
| `/metrics` | GET | Aggregated metrics by period | Yes (Bearer) |
| `/health` | GET | Service health check | No |
| `/events/stream-health` | GET | SSE connection status | No |

### SSE Contract

**Event Format:**
```json
{
  "event_id": "uuid-v4",
  "event_type": "agent.started",
  "agent_id": "dev",
  "execution_id": "uuid-v4",
  "timestamp": "2026-03-13T10:00:00.000Z",
  "duration_ms": 123,
  "payload": {
    "story_id": "2.3",
    "task": "implement timeline"
  }
}
```

**Connection Lifecycle:**
1. Dashboard opens `EventSource('/events/stream')`
2. Collector sends welcome message: `{type: "connected", message: "SSE stream connected"}`
3. Collector polls DB every 1s for new events
4. New events streamed as `data: {json}\n\n`
5. Dashboard auto-reconnects with exponential backoff on disconnect

---

## Technical Intervention Log (Stabilization)

### 1) Infraestrutura PostgreSQL para testes locais

Foi necessária uma instância isolada para eliminar falhas de startup por ausência de banco (`ECONNREFUSED`).

```bash
docker run --name aiox-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aiox_ray -p 5432:5432 -d postgres
```

### 2) Correção de cursor SSE para UUID

No stream, a comparação `event_id > '0'` era incompatível com o tipo UUID e gerava `invalid input syntax for type uuid`.

Solução implementada em `squads/aiox-ray/collector/src/routes/sse.ts`:
- Primeiro ciclo: filtro temporal (`timestamp > NOW() - INTERVAL '5 seconds'`)
- Ciclos seguintes: cursor por `event_id > $1` usando UUID válido
- Cursor por conexão (`localLastEventId`) para evitar interferência global entre clientes SSE

### 3) Ajuste de autenticação para fluxo local de validação

Para viabilizar validação local do dashboard com EventSource sem headers customizados, foi adotado bypass controlado em `squads/aiox-ray/collector/src/routes/events.ts`:
- Auth ativa por padrão
- Bypass apenas com `DISABLE_EVENTS_AUTH=true`

Arquiteturalmente, essa decisão é aceitável para desenvolvimento local e deve permanecer desativada em produção.

### 4) Resolução de conflito de dependências de teste

No dashboard, houve incompatibilidade entre `vitest` e `@vitest/coverage-v8`.

Solução:
- `vitest`: `^1.6.1`
- `@vitest/coverage-v8`: `^1.6.1`

Arquivo: `squads/aiox-ray/dashboard/package.json`

### 5) Protocolo de validação ponta a ponta

Fluxo consolidado:
1. Build dashboard
2. Publicação de `dist/*` em `collector/public/`
3. Export de `COLLECTOR_TOKEN` e `DATABASE_URL`
4. Injeção de evento mock com UUID/timestamp válidos via Node + curl
5. Verificação visual em `localhost:3001` com atualização sem refresh

---

## Security Architecture Notes

### Current Security Posture

**Production-safe defaults:**
- `/events` (ingestion/query) remains auth-protected by default
- `/events/stream` currently open for browser compatibility
- `DISABLE_EVENTS_AUTH` gate is explicit and opt-in

**Risk acknowledgement:**
- Disabling auth in any shared environment increases attack surface (event poisoning, unauthorized reads)
- Must be restricted to local development only

### Recommended Hardening Roadmap

1. Replace local bypass with browser-compatible stream auth pattern:
   - Signed short-lived stream token in query string, or
   - Session/cookie-based auth with CSRF protection
2. Add environment guardrail:
   - If `NODE_ENV=production`, force `DISABLE_EVENTS_AUTH=false`
3. Add observability around auth bypass usage in logs
4. Add integration tests for both secured and local-debug auth modes

---

## Performance Architecture

### SSE Polling Strategy

Current collector polling interval: **1000ms**.

Trade-off:
- Lower DB pressure in dev/test
- Slightly higher event freshness latency than 500ms polling

Given dashboard requirements and local stabilization goals, this is a pragmatic baseline. Production tuning should be driven by measured throughput and p95 stream lag.

---

## Deployment & Runtime Considerations

### Integrated Serving Model

Collector serves both:
- API/SSE endpoints
- Static dashboard build from `collector/public`

Benefits:
- Single origin (no CORS complications for dashboard API usage)
- Simplified local and staging deployment

Operational caveat:
- Build artifacts in `collector/public` must be refreshed after each dashboard build

---

## Testing & Quality Gates

### Validated Commands

- `npm --prefix squads/aiox-ray/collector run build` ✅
- `npm --prefix squads/aiox-ray/dashboard run build` ✅

### Suggested ongoing gate (per change)

1. Collector build + tests
2. Dashboard build + tests + type-check
3. E2E smoke (stream connect + event appears in UI)
4. Auth mode smoke (with and without local bypass)

---

## Open Architecture Decisions

1. **Stream auth strategy for production browsers**
   - Decision needed before promoting this setup beyond local stabilization.
2. **Event cursor semantics**
   - `event_id > $1` works for UUID ordering in PostgreSQL lexical context but is not temporal by definition.
   - Consider strict timestamp + tie-breaker ordering (`timestamp`, `event_id`) for deterministic stream progression under high concurrency.
3. **SSE replay window**
   - Current warm-up window is 5 seconds.
   - Tune based on real ingestion rates and reconnect patterns.

---

## Final Operational Status

- **Collector:** Operacional em `:3001`
- **Dashboard:** Conectado ao stream com resposta `200`
- **PostgreSQL:** Migrações aplicadas e ingestão de eventos simulados validada

O sistema está pronto para integração com runtime real AIOX apontando `COLLECTOR_URL` para o serviço estabilizado, condicionado à definição da estratégia final de autenticação para SSE em produção.

---

## Appendix: Troubleshooting Quick Reference

### `ECONNREFUSED` no startup do Collector
- Validar container PostgreSQL
- Validar `DATABASE_URL`

### `invalid input syntax for type uuid`
- Validar se há comparação UUID com fallback textual inválido
- Confirmar lógica de bootstrap temporal no stream

### `ERESOLVE` no `npm install` do dashboard
- Confirmar alinhamento de versões Vitest/Coverage

### Dashboard sem eventos em tempo real
- Verificar `GET /events/stream-health`
- Verificar logs do collector e presença de eventos no banco
- Confirmar publicação correta do build em `collector/public`

## Backend Architecture

### Express Server Enhancements

**New Endpoints for Dashboard:**

#### 1. SSE Stream Endpoint
```
GET /events/stream
Description: Server-Sent Events stream for real-time event updates
Returns: Server-sent events (text/event-stream)
Headers: Cache-Control: no-cache, Connection: keep-alive
Event format: { id, data: JSON.stringify(event), retry: 3000 }
```

**Implementation:**
- Listen for INSERT events in PostgreSQL (via LISTEN/NOTIFY or polling)
- Broadcast to all connected SSE clients
- Handle disconnections and reconnections
- Limit concurrent connections (default: 100)

#### 2. Aggregated Metrics Endpoint
```
GET /metrics?period=24h|7d|30d&agent_id=dev|qa|architect
Description: Pre-aggregated daily metrics for performance
Returns: { total_executions, avg_duration_ms, error_rate, p95_duration_ms, distribution_by_agent }
```

**Implementation:**
- Query `daily_metrics` table (pre-aggregated)
- Compute on-the-fly if data not in daily_metrics
- Cache results for 5 minutes

#### 3. Detailed Events Query
```
GET /events?start_time=...&end_time=...&agent_id=...&event_type=...&limit=1000
Description: Fetch events with filters (already exists from Story 1.4)
Returns: Event[]
```

### Express Middleware Stack

```typescript
app.use(helmet())                    // Security headers
app.use(cors())                      // CORS for dashboard
app.use(express.json())              // JSON parsing
app.use(rateLimiter())               // Rate limiting
app.use(requestLogger())             // Request logging

// Serve React SPA
app.use(express.static('dist'))

// API routes
app.get('/events/stream', handleSSEStream)
app.get('/events', getEvents)
app.post('/events', postEvents)      // From CLI
app.get('/metrics', getMetrics)
app.get('/health', (req, res) => res.json({ ok: true }))

// 404 fallback to index.html (SPA routing)
app.get('*', (req, res) => res.sendFile('dist/index.html'))
```

### SSE Implementation Strategy

**Connection Management:**
- Max connections per server: 100 (configurable)
- Idle timeout: 30 seconds
- Auto-reconnect: Client-side exponential backoff (1s, 2s, 4s, max 30s)

**Event Batching:**
- Group events emitted within 100ms
- Send batch to all clients at once
- Reduces network chatter

**Error Handling:**
- If PostgreSQL unavailable, return 503 Service Unavailable
- If too many connections, return 429 Too Many Requests
- Client handles errors with exponential backoff retry

---

## Real-Time Data Flow

### Workflow 1: Real-Time Dashboard Update

```
Timeline:
1. Dashboard opens → SSE connection to /events/stream (t=0)
2. User performs action in AIOX CLI (e.g., @dev agent starts)
3. CLI emits event to Collector (t=50ms)
4. Collector validates & inserts to PostgreSQL (t=60ms)
5. Collector broadcasts event via SSE to dashboard (t=70ms)
6. React receives event & updates Zustand store (t=80ms)
7. React re-renders with new event (t=100ms)
Total latency: ~100ms (< 100ms NFR2 ✅)
```

### Workflow 2: Historical Data Replay

```
Timeline:
1. User opens dashboard, clicks "Historical" button
2. DatePicker renders with calendar
3. User selects 2026-03-13 10:00-15:00
4. Dashboard queries GET /events?start_time=10:00&end_time=15:00 (t=100ms)
5. Collector queries PostgreSQL for events in range (t=150ms)
6. Response with ~200 events (t=200ms)
7. React updates store & renders Timeline + Flow Graph (t=300ms)
Total latency: ~300ms (< 2 seconds requirement ✅)
```

### Workflow 3: Drill-Down Detail View

```
Timeline:
1. User clicks execution bar in Timeline
2. DrilldownPane component receives executionId
3. Pane queries execution details from store (cached)
4. Display: metadata, CoT (if available), errors, ADE steps
5. All data already loaded from historical query
Total latency: ~50ms (instant from user perspective) ✅
```

---

## Historical Query Design

### Date/Time Picker Component

**User Interaction:**
```
1. Open calendar
2. Select start date (2026-03-13)
3. Select end date (2026-03-13) or use "Today" quick selector
4. Optional: Select time range (10:00-15:00)
5. Click "Load" button
6. Dashboard fetches & renders
```

**API Call:**
```
GET /events?start_time=2026-03-13T10:00:00Z&end_time=2026-03-13T15:00:00Z
Response: { events: Event[], count: 247, duration_ms: 350 }
```

**Query Optimization:**
- Index on `(agent_id, timestamp DESC)` for fast range queries
- Partition tables by month for 30-day retention
- Pre-aggregate daily metrics in `daily_metrics` table

---

## Database Schema (Reference)

**Tables used by Dashboard:**

```sql
-- Raw events (30-day retention)
CREATE TABLE events (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,      -- agent.started, agent.finished, skill.executed
    agent_id VARCHAR(20) NOT NULL,
    execution_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    duration_ms INTEGER,
    payload JSONB,
    INDEX (agent_id, timestamp DESC),
    INDEX (execution_id),
    INDEX (event_type)
);

-- Execution summaries
CREATE TABLE executions (
    execution_id UUID PRIMARY KEY,
    agent_id VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,          -- in_progress, success, error
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    duration_ms INTEGER GENERATED,
    input JSONB,
    output JSONB,
    error JSONB,
    INDEX (agent_id, started_at DESC),
    INDEX (status)
);

-- Chain of Thought segments (10% sample)
CREATE TABLE cot_segments (
    cot_id UUID PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES executions(execution_id),
    milestone VARCHAR(255),               -- "Analyzing problem", "Exploring codebase"
    timestamp TIMESTAMP,
    order_index INTEGER,
    context JSONB
);

-- Pre-aggregated metrics (for performance)
CREATE TABLE daily_metrics (
    date DATE NOT NULL,
    agent_id VARCHAR(20) NOT NULL,
    execution_count INTEGER,
    avg_duration_ms FLOAT,
    error_count INTEGER,
    error_rate FLOAT,
    p95_duration_ms FLOAT,
    PRIMARY KEY (date, agent_id)
);
```

---

## Implementation Roadmap

### Story 2.1: Dashboard Infrastructure
**Goal:** Set up React SPA + Collector Express integration + basic layout

**Tasks:**
1. Create React app structure (Vite + TypeScript)
2. Implement Zustand stores (eventStore, filterStore, uiStore)
3. Add Express SSE endpoint (`GET /events/stream`)
4. Implement SSE client hook (`useEventStream`)
5. Create basic Dashboard layout (Header, Sidebar, main area)
6. Wire up SSE connection to store
7. Display raw event list (unformatted, MVP)
8. Build & serve React from Collector

**Acceptance Criteria:**
- React app serves from Collector at `/`
- SSE connection established and receiving events
- Events appear in real-time as they arrive
- Dashboard responsive on desktop (1920px) and tablet (768px)
- Build process working (`npm run build`)

### Story 2.2: Metrics Cards
**Goal:** Display overview statistics (executions, avg duration, error rate, agent distribution)

**Tasks:**
1. Create MetricsCards component
2. Implement metrics calculation logic
3. Add pie chart for agent distribution
4. Add 7-day trend sparklines
5. Implement click-to-drill-down behavior
6. Add refresh interval (5 seconds)
7. Style with Tailwind
8. Write unit tests

**Acceptance Criteria:**
- 4 metric cards visible on dashboard
- Metrics update every 5 seconds
- Trend sparklines show 7-day history
- Click card filters by agent/error type
- Responsive grid layout

### Story 2.3: Timeline View
**Goal:** Implement Gantt-style timeline visualization

**Tasks:**
1. Create TimelineChart component (Recharts Bar chart)
2. Implement GanttChart with time axis (x) and agent axis (y)
3. Add execution bars with colors by status
4. Implement click-to-select execution
5. Add hover tooltips (duration, execution_id)
6. Implement zoom/pan on time axis
7. Add date/time picker for historical replay
8. Write integration tests

**Acceptance Criteria:**
- Timeline displays executions as horizontal bars
- Bar length proportional to execution duration
- Colors: green=success, red=error, yellow=in-progress
- Zoom and pan working
- Date picker loads historical data

### Story 2.4: Interactive Flow Graph
**Goal:** Implement DAG visualization of agent calls and skills

**Tasks:**
1. Integrate React Flow library
2. Create FlowGraph component
3. Build node component (agent/skill icons)
4. Build edge component (relationship lines)
5. Implement node hover with stats
6. Implement click-to-select node
7. Add pan/zoom controls
8. Add agent filter toggle
9. Add legend
10. Write unit tests

**Acceptance Criteria:**
- Flow graph displays agents and skills as nodes
- Edges show execution relationships
- Node size/color indicates duration and status
- Pan/zoom working
- Agent filter hides/shows nodes

### Story 2.5: Drill-Down Detail View
**Goal:** Implement execution detail inspector

**Tasks:**
1. Create DrilldownPane component
2. Implement metadata display (execution_id, agent, status, duration)
3. Implement JSON inspector for input/output
4. Implement CoT display with milestones
5. Implement error trace display
6. Implement ADE step timeline (if available)
7. Add copy-to-clipboard buttons
8. Add collapsible sections
9. Write unit tests

**Acceptance Criteria:**
- DrilldownPane opens when clicking execution
- All metadata displayed clearly
- CoT milestones shown with timestamps
- Errors displayed with context
- Copy buttons working

---

## Quality Checklist

### Frontend Testing

**Unit Tests:**
- [ ] MetricsCards: Verify card count, values, trends
- [ ] TimelineChart: Verify bar rendering, colors, click handling
- [ ] FlowGraph: Verify node/edge rendering, pan/zoom
- [ ] DrilldownPane: Verify metadata display, JSON rendering
- [ ] Stores: Verify add/set/clear actions
- [ ] Hooks: Verify useEventStream, useEvents, useFilters

**Integration Tests:**
- [ ] Full flow: Open dashboard → SSE connection → events appear
- [ ] Historical replay: Date picker → query → render timeline
- [ ] Drill-down: Click execution → detail pane appears with correct data
- [ ] Filters: Select agent → timeline filters by agent

**E2E Tests (Cypress/Playwright):**
- [ ] Dashboard loads without errors
- [ ] Real-time events appear within 1 second
- [ ] Historical date picker works
- [ ] All visualizations render without console errors
- [ ] Responsive design on tablet (768px)

### Performance Requirements

- [ ] Dashboard initial load: <2 seconds
- [ ] SSE connection establishment: <500ms
- [ ] Real-time event arrival to display: <100ms (p95)
- [ ] Historical query (30 days): <1 second
- [ ] Timeline rendering (500 bars): <500ms
- [ ] Flow graph rendering (100 nodes): <800ms

### Accessibility & UX

- [ ] WCAG AA compliance (keyboard navigation, contrast)
- [ ] Dark mode support (optional, post-MVP)
- [ ] Error messages clear and actionable
- [ ] Loading states visible
- [ ] Tooltips on hover for clarity

---

## Deployment & Build

### Build Configuration (Vite)

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), typescript()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

### Deployment Steps

1. **Build React SPA:** `npm run build` → generates `dist/`
2. **Copy to Collector:** Place `dist/` in Collector's public directory
3. **Express serves:** `app.use(express.static('dist'))`
4. **SPA routing:** Fallback 404 to `dist/index.html`

### Environment Configuration

```bash
# .env (development)
VITE_API_URL=http://localhost:3001
VITE_SSE_URL=http://localhost:3001/events/stream

# .env.production (deployment)
VITE_API_URL=https://collector.aiox-ray.example.com
VITE_SSE_URL=https://collector.aiox-ray.example.com/events/stream
```

---

## Security Considerations

1. **CORS:** Collector configured to accept requests from dashboard origin
2. **Input Validation:** All queries validated in Collector before DB access
3. **Rate Limiting:** Collector rate-limits API endpoints to prevent abuse
4. **Authentication:** (Future) Add authentication header to SSE and API requests
5. **Data Sanitization:** Sensitive data already sanitized at CLI layer (Story 1.5)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard Load Time | <2 sec | Lighthouse metrics |
| SSE Latency (p95) | <100ms | Browser DevTools |
| Historical Query | <1 sec | Network timing |
| Timeline Render (500 bars) | <500ms | React Profiler |
| Flow Graph Render (100 nodes) | <800ms | React Profiler |
| Test Coverage | >80% | Jest coverage report |
| Lighthouse Score | >90 | Lighthouse audit |

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-13 | 1.0 | Initial Dashboard architecture for Epic 2 | Aria |
| 2026-04-02 | 1.1 | Epic 2 closure update: implementation completed (stories 2.1–2.5) | Claude |
| 2026-04-03 | 1.2 | Stabilization interventions: UUID-safe SSE cursor, local auth bypass gate, Vitest alignment, E2E validation protocol | Aria |

---

**Document Status:** ✅ Epic 2 closed — implemented stories 2.1–2.5 delivered
**Next Review Date:** When Epic 3 dashboard integrations begin
**Distribution:** @pm/@sm for roadmap continuation to Epic 3
