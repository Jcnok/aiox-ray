# AIOX-Ray Dashboard

React SPA for real-time visualization of AIOX agent execution events.

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd squads/aiox-ray/dashboard
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173` (Vite dev server) or `http://localhost:3001` (when served from Collector).

## Building

Create a production build:

```bash
npm run build
```

Output: `dist/` directory (static files)

## Testing

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run specific test file

```bash
npm test -- eventStore.test.ts
```

### Generate coverage report

```bash
npm test -- --coverage
```

## Architecture

### Directory Structure

```
src/
├── components/       # React components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Layout.tsx
│   └── EventList.tsx
├── stores/          # Zustand state management
│   ├── eventStore.ts
│   ├── filterStore.ts
│   └── uiStore.ts
├── hooks/           # React hooks
│   └── useEventStream.ts
├── services/        # Services
│   └── sseClient.ts
├── App.tsx          # Root component
├── index.tsx        # Entry point
└── index.css        # Global styles

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── fixtures/       # Test data
```

### State Management (Zustand)

**eventStore**: Global event stream
- `events`: Array of Event objects
- `addEvent()`: Add single event
- `setEvents()`: Replace all events
- `clearEvents()`: Clear all events
- `getEventsByExecutionId()`: Filter by execution ID

**filterStore**: User-selected filters
- `agentId`: Chosen agent filter
- `startTime`, `endTime`: Time range filter
- `errorType`: Error type filter
- Methods to update each filter

**uiStore**: UI state
- `selectedExecutionId`: Currently inspected execution
- `isLoading`: Data loading state
- `error`: Error message to display

### SSE Integration

**useEventStream hook**: Subscribes to `/events/stream` endpoint on Collector

- Automatically connects on component mount
- Parses JSON events from SSE stream
- Adds events to eventStore in real-time
- Handles disconnections with exponential backoff retry
- Cleans up on unmount

**SSEClient service**: Low-level SSE connection management

- Manages EventSource lifecycle
- Implements exponential backoff for retries (1s → 2s → 4s... max 30s)
- Max 10 retry attempts
- Graceful error handling

## Deployment

### Prerequisites

1. Collector service must be running (port 3001)
2. PostgreSQL database must be accessible from Collector
3. Dashboard build must be copied to Collector's public directory

### Steps

1. **Build React SPA**
   ```bash
   npm run build
   ```

2. **Copy to Collector**
   ```bash
   cp -r dist/* ../collector/public/
   ```

3. **Start Collector**
   ```bash
   cd ../collector
   npm run dev
   ```

4. **Access Dashboard**
   - Open `http://localhost:3001`
   - Dashboard will connect to SSE stream at `/events/stream`
   - Real-time events will appear immediately

## Performance Targets

- Dashboard initial load: <2 seconds
- SSE connection: <500ms
- Real-time event latency: <100ms (p95)
- Responsive on desktop (1920px) and tablet (768px)

## Troubleshooting

### Dashboard doesn't load

1. Verify Collector is running: `curl http://localhost:3001/health`
2. Check browser console for errors
3. Verify network tab shows successful fetch for `index.html`

### Events not appearing

1. Verify SSE connection: Open DevTools → Network → Look for `/events/stream` (should be EventSource)
2. Check Collector logs for SSE errors
3. Verify PostgreSQL has events in `events` table
4. Try emitting a test event from CLI

### SSE reconnecting frequently

1. Check Collector logs for errors
2. Verify database connection is stable
3. Check for network issues between browser and Collector
4. Increase polling interval if database queries are slow

## Future Enhancements

- Story 2.2: Metrics Cards (overview statistics)
- Story 2.3: Timeline View (Gantt chart)
- Story 2.4: Interactive Flow Graph
- Story 2.5: Drill-Down Detail View
- Dark mode support
- Filtering and search capabilities
- Export data to CSV/JSON
- Audit reports

## References

- [Architecture](../../docs/architecture-dashboard.md)
- [Epic 2: Dashboard & Visualization](../../docs/prd.md#epic-2--dashboard--visualization)
- React: https://react.dev
- Zustand: https://github.com/pmndrs/zustand
- Vite: https://vitejs.dev
- Tailwind CSS: https://tailwindcss.com
