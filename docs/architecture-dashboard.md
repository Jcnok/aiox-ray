# AIOX-Ray Dashboard & Visualization Architecture
## Epic 2: Dashboard & Visualization

**Version:** 1.0
**Date:** 2026-03-13
**Author:** Aria (Architect)
**Status:** Ready for Implementation
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
- Y-axis: Agent (group by agent_id)
- Bars: Execution duration
- Colors: Status (green=success, red=error, yellow=in-progress)
- Height: ~40px per agent

**Features:**
- Hover: Show duration + execution_id
- Click bar: Select execution (trigger DrilldownPane)
- Zoom: Scroll to zoom on time axis
- Pan: Drag to move timeline

**Performance:** Max 500 bars on screen (paginate if needed)

#### 3. FlowGraph (Story 2.4)
**Props:**
- `events: Event[]` — All events
- `onSelectNode: (nodeId: string) => void` — Selection callback

**Display:**
- Nodes: Agents + Skills (node type determines icon)
- Edges: Event relationships (parent_execution_id → child_execution_id)
- Node size: Proportional to total_duration
- Node color: Status (green=success, red=error)
- Hover label: `agent: avg_duration_ms | error_rate%`

**Features:**
- Click node: Open NodeDetail popup with stats
- Pan/Zoom: React Flow built-in
- Filter by agent: Hide/show agent nodes
- Legend: Node types and color meanings

**Performance:** Max 50-100 nodes (auto-group if needed)

#### 4. DrilldownPane (Story 2.5)
**Props:**
- `executionId: string` — Selected execution
- `onClose: () => void` — Close callback

**Display:**
- Execution metadata: execution_id, agent_id, status, duration, timestamps
- Input/Output: JSON with copy-to-clipboard
- Chain of Thought: If available (10% sample), show milestones with timestamps
- Errors: Error events linked to this execution, with stack traces
- ADE Steps: If available, show recovery steps in timeline
- Raw JSON: For advanced debugging

**Features:**
- Copy buttons for execution_id, CoT milestones, error traces
- Collapsible sections for each category
- Syntax highlighting for JSON
- "Share" button to generate shareable link (TBD)

---

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

---

**Document Status:** ✅ Ready for Story 2.1 Implementation
**Next Review Date:** After Story 2.1 completion
**Distribution:** @sm (River) for Story 2.1 creation → @dev (Dex) for implementation
