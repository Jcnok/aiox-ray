# AIOX-Ray Product Requirements Document (PRD)

**Document Version:** 1.0
**Date Created:** 2026-03-13
**Status:** Active Development
**Primary Stakeholders:** AIOX Framework Team, Developers, Architects, QA

---

## Goals and Background Context

### Goals

- Deliver comprehensive observability of AIOX agent execution in real-time and historical modes
- Enable automatic identification of performance bottlenecks, error patterns, and optimization opportunities
- Implement autonomous analysis agent (@auditor) to generate actionable improvement suggestions
- Provide CLI-first architecture with Dashboard as secondary visualization layer
- Establish foundation for continuous self-improvement cycle of AIOX framework

### Background Context

The AIOX framework orchestrates multiple AI agents (@dev, @qa, @architect, @pm, @po, @sm, @analyst, etc.) to perform complex development tasks. While the framework excels at autonomous execution, there is currently no systematic visibility into how agents behave in production, where bottlenecks occur, or how to optimize agent interactions.

AIOX-Ray solves this by instrumenting the CLI to emit structured events, collecting them in a central storage system, and analyzing patterns through both a visual dashboard and an intelligent auditor agent. This meta-observability system follows AIOX's core philosophy: CLI First, Observability Second, UI Third.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-13 | 1.0 | Initial PRD - Marcos 1-3 focused on data collection, visualization, and auditing | Morgan |

---

## Requirements

### Functional Requirements

**FR1:** The system shall capture agent lifecycle events (agent.started, agent.finished) with agent ID, input, output, timestamp, and duration for @dev, @qa, @architect, and @orchestrator agents.

**FR2:** The system shall capture error events (error.occurred) including error details, context, timestamp, and affected agent/skill for root cause analysis.

**FR3:** The system shall capture recovery attempts (recovery.attempt) from the ADE Recovery System to track self-healing behaviors and success rates.

**FR4:** The system shall capture skill execution events (skill.executed) including skill name, parameters, execution duration, and result status.

**FR5:** The system shall capture Chain of Thought (CoT) segments at 10% sampling rate, capturing milestone markers ("Analisando o problema", "Explorando a base de código", etc.) to reduce overhead while preserving insight.

**FR6:** The system shall provide a REST API (GET /events) supporting filters by agent_id, timestamp range, event_type, and execution_id to enable queries by external systems.

**FR7:** The system shall sanitize sensitive data (API keys, tokens, passwords, PII) at the CLI instrumentation layer before events reach the collector, using configurable regex patterns.

**FR8:** The system shall display real-time execution events via Server-Sent Events (SSE) in the Dashboard to enable live monitoring of agent behavior.

**FR9:** The system shall provide historical replay mode allowing users to select any past time period and visualize execution timeline (Gantt-style).

**FR10:** The system shall render an interactive flow graph showing the hierarchy and sequence of agent calls, with drill-down capability to inspect detailed execution context, CoT, logs, and ADE steps.

**FR11:** The Dashboard shall display overview metrics: total execution count, average duration, error rate, and distribution by agent type.

**FR12:** The Dashboard shall support filtering by agent, time period, error type, and project to narrow analysis scope.

**FR13:** The @auditor agent shall perform on-demand analysis (`*analyze --period=24h`) and generate plain-language suggestions without automatic action (MVP).

**FR14:** The @auditor agent shall generate daily batch reports identifying patterns, performance anomalies, recurring errors, and improvement opportunities.

**FR15:** The @auditor agent shall have read-only access to agent configuration files (prompts, logic) to correlate with execution data and produce contextual recommendations.

### Non-Functional Requirements

**NFR1:** The instrumentation layer shall introduce <5% overhead to agent execution time; measured by comparing execution duration with and without instrumentation enabled.

**NFR2:** Event ingestion latency from CLI emission to database storage shall be <100ms for 95th percentile under normal load.

**NFR3:** Raw event data shall be retained for 30 days; aggregated metrics (daily summaries) shall be retained indefinitely.

**NFR4:** The system shall support estimated typical load of ~2,500 events/day (5 developers, 50 executions/dev/day, ~10 events/execution) with headroom for 10x growth.

**NFR5:** All event emissions shall be asynchronous and non-blocking; failure to send events shall not interrupt agent execution.

**NFR6:** The Dashboard shall be responsive across desktop and tablet devices; mobile support deferred to post-MVP.

**NFR7:** The @auditor agent shall complete on-demand analysis within 5 seconds for a 24-hour period on typical hardware.

**NFR8:** Event schema shall be versioned and extensible to accommodate future event types and agents without breaking existing collectors.

**NFR9:** Security: Collector API shall require authentication (mechanism TBD by @architect: shared key, JWT, mTLS) to prevent unauthorized event injection.

**NFR10:** The system shall comply with AIOX Constitution Article IV (No Invention): auditor suggestions must be grounded in execution data or code analysis, never invented.

---

## User Interface Design Goals

### Overall UX Vision

The Dashboard is a *secondary* interface (CLI is primary). It serves developers and architects debugging AIOX behavior, not end users. The focus is clarity and technical precision over visual polish.

### Key Interaction Paradigms

- **Real-time monitoring:** Live stream of agent executions with status indicators (success/error/in-progress)
- **Historical browsing:** Select any past time period to replay and analyze executions
- **Drill-down exploration:** Click on execution nodes or timeline bars to inspect details
- **Filtering & search:** Narrow scope by agent, time, error type, project

### Core Screens and Views

1. **Overview Dashboard** — High-level metrics cards, recent execution summary
2. **Timeline View (Gantt)** — Execution timeline with duration bars, gargalos highlighted
3. **Flow Graph** — Interactive directed graph of agent calls and skill executions
4. **Execution Detail** — Full context for a single execution: CoT, logs, ADE steps, errors
5. **Audit Reports** — Daily/on-demand @auditor suggestions and pattern analysis

### Accessibility

WCAG AA minimum; technical users (developers/architects) are primary audience.

### Target Platforms

Web Responsive (desktop and tablet). Mobile support deferred to post-MVP.

---

## Technical Assumptions

### Repository Structure

**Decision:** Monorepo structure (AIOX already uses)

**Rationale:** AIOX is managed as a monorepo with core, packages, and squads directories. AIOX-Ray components (@dev instrumentat, coletor, dashboard) fit naturally into existing structure (packages, squads/aiox-ray/, .aiox-core/agents/).

### Service Architecture

**Decision:** Distributed microservices pattern (three independent components)

**Rationale:**
- **Instrumentação (CLI):** Integrated into AIOX core CLI as hooks/middleware
- **Collector/API:** Standalone Node.js/Express service (can run locally or remote)
- **Dashboard:** Standalone React SPA served by the Collector's Express server

This separation allows independent scaling, testing, and deployment while keeping integration simple.

### Testing Requirements

**Decision:** Full Testing Pyramid (Unit + Integration + E2E)

**Rationale:**
- **Unit tests:** For event schema validation, sanitization logic, API endpoints
- **Integration tests:** For Collector ↔ Database flow, event persistence, query accuracy
- **E2E tests:** For Dashboard rendering, live event stream display, historical replay
- Critical constraint: Performance testing (<5% overhead) must be included in suite

### Additional Technical Assumptions

- **Instrumentation delivery:** Async/non-blocking via Node.js EventEmitter or custom queue (TBD by @architect)
- **Database:** PostgreSQL with JSONB columns for event payload flexibility
- **Real-time communication:** Server-Sent Events (SSE) for simplicity; WebSockets deferred to post-MVP
- **Agent Framework:** @auditor implemented as standard AIOX agent with memory layer integration
- **Deployment:** Docker containerization for Collector; Dashboard as static/SPA served from Collector

---

## Epic List

### Epic 1: Foundation — Data Instrumentation & Collection

**Goal:** Instrument the AIOX CLI to emit structured events from @dev, @qa, @architect agents, and implement a collector service to receive and persist events in PostgreSQL. This epic establishes the data foundation enabling all downstream analytics.

**Stories:** 6 stories (see Epic Details)
**Estimated Duration:** 2 weeks
**Dependencies:** None (foundation epic)

### Epic 2: Dashboard & Visualization

**Goal:** Build a web-based dashboard displaying real-time and historical event data, with interactive visualizations (timeline, flow graph) and filtering capabilities to enable developers to observe agent behavior and identify bottlenecks.

**Stories:** 5 stories
**Estimated Duration:** 2-3 weeks
**Dependencies:** Epic 1 must be complete (data source ready)

### Epic 3: Auditor Agent & Analysis

**Goal:** Implement @auditor agent capable of analyzing execution patterns, identifying performance anomalies and recurring errors, and generating actionable improvement suggestions in plain language without automatic action.

**Stories:** 4 stories
**Estimated Duration:** 2 weeks
**Dependencies:** Epic 1 (data to analyze) + @auditor agent framework availability

### Epic 4: Refinement & Scale (Post-MVP)

**Goal:** Gather user feedback, optimize performance, expand instrumentation to additional agents (@pm, @po, @sm, etc.), and prepare for production scale.

**Stories:** TBD (user feedback driven)
**Estimated Duration:** Ongoing
**Dependencies:** Epics 1-3 complete

---

## Epic 1 — Foundation: Data Instrumentation & Collection

### Expanded Goal

Instrument the AIOX CLI to emit structured events from core execution agents, implement a collector service to receive and normalize events, and persist them in PostgreSQL. The epic includes sanitization of sensitive data and performance validation to ensure <5% overhead. Upon completion, all agent executions generate observable, queryable event data.

### Story 1.1: Implement Instrumentation Hooks in @dev Agent

**As a** framework maintainer,
**I want** the @dev agent to emit lifecycle events (started, finished) to a collector,
**so that** I can observe when @dev begins and completes tasks and measure execution duration.

#### Acceptance Criteria

1. When @dev is activated, an event {event_type: "agent.started", agent_id: "dev", timestamp, input, execution_id} is emitted to collector endpoint (POST /events)
2. When @dev completes or errors, an event {event_type: "agent.finished", agent_id: "dev", timestamp, output, duration, status} is emitted
3. If collector is unavailable, events are queued locally with exponential backoff retry (max 3 attempts)
4. Emission is fully asynchronous; no blocking of agent execution
5. Measured overhead from instrumentation is <1% (baseline run time + hook ≤ 1% slower)
6. No agent functionality is altered; instrumentation is transparent to end user

### Story 1.2: Extend Instrumentation to @qa and @architect Agents

**As a** framework maintainer,
**I want** @qa and @architect agents to emit the same lifecycle events as @dev,
**so that** I have complete visibility into all core agent executions.

#### Acceptance Criteria

1. Both @qa and @architect emit agent.started and agent.finished events following the same schema as @dev
2. Reuse instrumentation pattern from Story 1.1 (no code duplication)
3. Each agent's execution_id is unique and traceable
4. No additional overhead beyond that measured in Story 1.1 (<1% per agent)
5. All three agents (@dev, @qa, @architect) appear in collector's GET /events with correct agent_id filters

### Story 1.3: Implement Skill Execution Event Capture

**As a** framework maintainer,
**I want** to capture skill execution events (skill.executed) including skill name, parameters, duration, and result,
**so that** I can identify which skills consume time and which fail frequently.

#### Acceptance Criteria

1. When any skill (CLI built-in or custom) is invoked, a skill.executed event is emitted with {event_type: "skill.executed", agent_id, skill_name, parameters (sanitized), duration_ms, status, result_summary}
2. Skill events are linked to parent agent execution via execution_id
3. Parameters are sanitized (secrets removed) before emission
4. Skill execution is never blocked waiting for event emission
5. Event ingestion is <100ms latency in 95th percentile

### Story 1.4: Build Collector Service & PostgreSQL Storage

**As a** backend engineer,
**I want** a Node.js/Express collector service that receives events via POST /events, validates them, and persists to PostgreSQL,
**so that** events are stored durably and queryable.

#### Acceptance Criteria

1. Collector listens on configurable port (default 3001) and accepts POST /events with JSON event payload
2. Events are validated against schema (required fields: event_type, agent_id, timestamp, execution_id)
3. Valid events are inserted into PostgreSQL tables: events (raw), agents (metadata), metrics (aggregated)
4. Invalid events are logged and rejected (HTTP 400) without corrupting database
5. GET /events supports filters: ?agent_id=dev&start_time=2026-03-13T00:00Z&end_time=2026-03-13T23:59Z&event_type=agent.finished
6. Database schema includes indices on (agent_id, timestamp, event_type, execution_id) for performance
7. Collector can handle 100+ events/second without queueing or loss (under normal conditions)

### Story 1.5: Implement Data Sanitization & Security

**As a** security engineer,
**I want** all sensitive data (API keys, tokens, PII) to be masked before reaching the collector,
**so that** the event database never contains secrets or personal information.

#### Acceptance Criteria

1. Instrumentation layer sanitizes event payloads using configurable regex patterns (e.g., matches for "api_key=...", "password=...", email patterns)
2. Matched secrets are replaced with "[REDACTED]" or "[SANITIZED]" markers
3. Sanitization rules are externalized to a config file (e.g., .aiox-ray-sanitize.yaml) with examples for common patterns
4. A test suite verifies that common secret patterns (AWS keys, Stripe tokens, email addresses) are caught and masked
5. Sanitization adds <0.5% overhead
6. Documentation explains how users can extend sanitization rules for custom secrets

### Story 1.6: Performance Testing & Overhead Validation

**As a** quality engineer,
**I want** to benchmark agent execution time with and without instrumentation enabled,
**so that** I can confirm overhead is <5% and identify any bottlenecks.

#### Acceptance Criteria

1. Create a test harness that runs @dev on a standard task 10 times (uninstrumented baseline) and 10 times (with instrumentation enabled)
2. Measure and record execution duration, memory usage, CPU time for each run
3. Calculate overhead: (avg_instrumented - avg_baseline) / avg_baseline * 100
4. Assert that overhead is <5% with 95% confidence
5. Generate a report showing breakdown by component: hooks (~0.5%), event serialization (~0.3%), async send (~0.2%), etc.
6. If overhead exceeds 5%, identify and document the cause and mitigation (e.g., switch to sampling, increase batch size)

---

## Epic 2 — Dashboard & Visualization

### Expanded Goal

Build a React-based web dashboard that consumes event data from the Collector, displaying real-time execution activity via SSE and historical replay via date/time selection. Include interactive visualizations (timeline gantt chart, flow graph, metrics cards) and filtering to enable developers to observe and debug agent behavior.

### Story 2.1: Set Up Dashboard Infrastructure (React SPA + Collector Express)

**As a** frontend engineer,
**I want** a React application served by the Collector's Express server with live connection to the event stream,
**so that** I have a foundation to build visualizations on.

#### Acceptance Criteria

1. Express server serves a React SPA at / (e.g., /dist/index.html)
2. React app connects to collector's SSE endpoint (GET /events/stream) and receives live event updates
3. React app can render basic HTML showing received events in real-time (unformatted, for MVP testing)
4. Page is responsive on desktop (1920px width) and tablet (768px)
5. Build process (webpack/vite) is configured and deployable via `npm run build`

### Story 2.2: Implement Overview Dashboard (Metrics Cards)

**As a** developer,
**I want** to see high-level metrics on the dashboard (total executions, avg duration, error rate),
**so that** I can quickly assess system health.

#### Acceptance Criteria

1. Dashboard displays 4 metric cards: Total Executions (count), Avg Duration (seconds), Error Rate (%), Distribution by Agent (pie chart)
2. Metrics are computed from real-time event stream and updated every 5 seconds
3. Cards show both current-day stats and 7-day trend (sparkline)
4. Clicking a card drills down to detail view with breakdown by agent/error type
5. Cards are styled and responsive; dark mode optional

### Story 2.3: Implement Timeline View (Gantt Chart)

**As a** developer,
**I want** to see a timeline of all executions with duration bars (Gantt-style),
**so that** I can identify which executions took longest and spot gargalos.

#### Acceptance Criteria

1. Timeline displays bars for each execution, x-axis = time, y-axis = agent (or grouped by execution)
2. Bar length = execution duration; bar color = status (green=success, red=error, yellow=in-progress)
3. Clicking a bar opens detail pane showing full execution context
4. Timeline is zoomable and scrollable (horizontal for time, vertical for agent list)
5. Supports historical date/time picker to view any past period (within 30-day retention)

### Story 2.4: Implement Interactive Flow Graph

**As a** architect,
**I want** to see a directed graph of agent calls and skill invocations,
**so that** I can understand the dependency structure and bottlenecks in execution chains.

#### Acceptance Criteria

1. Flow graph displays nodes for agents and skills, edges for invocation relationships
2. Node size/color indicates execution duration and status (success/error)
3. Hovering over a node shows summary stats (total calls, avg duration, error count)
4. Clicking a node opens drill-down pane with detailed metrics and logs
5. Graph is interactive (pan, zoom, drag nodes for layout)
6. Graph can be filtered by agent or time range

### Story 2.5: Implement Drill-Down Detail View

**As a** developer,
**I want** to click on any execution and see full context (CoT, logs, ADE steps, errors),
**so that** I can understand what happened during the execution.

#### Acceptance Criteria

1. Detail pane displays: execution ID, agent, duration, status, input, output
2. If CoT is available (10% sample), display formatted Chain of Thought with milestones
3. Display any error events and error details
4. Show ADE steps (if available) in a collapsible timeline
5. Display raw event JSON for advanced debugging
6. Copy-to-clipboard button for sharing execution ID or context

---

## Epic 3 — Auditor Agent & Analysis

### Expanded Goal

Implement a new @auditor agent capable of querying the event database, analyzing patterns (performance anomalies, recurring errors, slow skills, high-error agents), and generating plain-language recommendations for improvement. The auditor supports both on-demand analysis and daily batch reporting, without automatic action (MVP).

### Story 3.1: Implement @auditor Agent Framework

**As a** system architect,
**I want** @auditor to be a fully-formed AIOX agent with standard command structure,
**so that** it can be invoked like other agents and integrate with the framework.

#### Acceptance Criteria

1. @auditor agent definition created in `.aiox-core/agents/auditor.md` following AIOX agent template
2. Agent has commands: `*analyze --period=X`, `*daily-report`, `*help`, `*exit`
3. Agent has memory layer integration (can store analysis insights for future sessions)
4. Agent respects Constitution Article IV (No Invention): all suggestions grounded in data
5. Agent can be activated as `@auditor` and tested with `*help` command

### Story 3.2: Implement On-Demand Analysis (`*analyze`)

**As a** developer,
**I want** to run `*analyze --period=24h` and receive a summary of issues and opportunities,
**so that** I can quickly understand what needs attention.

#### Acceptance Criteria

1. `*analyze --period=24h` queries the event database for the past 24 hours
2. Analysis identifies: agents with highest error rate, skills with longest avg duration, most common error types, execution count by agent
3. Results are presented in plain language with specific, actionable suggestions (e.g., "Agent @qa had 15% error rate on story validation; review recent story format changes")
4. Analysis completes in <5 seconds for typical data volume
5. Results include data sources cited (e.g., "based on 150 @qa executions")

### Story 3.3: Implement Daily Batch Report (`*daily-report`)

**As a** framework maintainer,
**I want** a daily summary report of the previous day's executions,
**so that** I can track health trends and identify systemic issues.

#### Acceptance Criteria

1. Daily report is generated automatically at configured time (e.g., 8am UTC) or on-demand via `*daily-report` command
2. Report includes: summary stats (total executions, avg duration, error rate), breakdown by agent, top 5 slowest executions, top 5 most common errors
3. Report identifies trends vs. previous days (e.g., "error rate up 5% compared to yesterday")
4. Report includes recommendations for attention (e.g., "Agent @architect had 2 failures in schema design; review recent PRD changes")
5. Report is saved as markdown file in docs/auditor-reports/ and optionally emailed/posted (TBD)

### Story 3.4: Code Analysis & Prompt Optimization Suggestions

**As a** system architect,
**I want** @auditor to read agent prompts and suggest improvements when patterns suggest ambiguity or confusion,
**so that** we can continuously improve agent effectiveness.

#### Acceptance Criteria

1. @auditor reads agent prompt files from `.aiox-core/agents/` (e.g., agent/@dev.md)
2. When @auditor detects a pattern (e.g., repeated failures in a specific task type), it examines the agent's prompt for relevant sections
3. Auditor suggests clarifications to the prompt with specific examples or edge case handling (e.g., "Prompt lacks guidance for handling ambiguous requirements; consider adding example with clarifying questions")
4. Suggestions are data-backed: "in the past 50 @dev executions, 8 failures involved ambiguous story specs; prompt should include...")
5. Suggestions are presented as markdown-formatted recommendations ready for human review and incorporation

---

## Checklist Results Report

**PM Checklist Status:** ✅ All gates passed for Epic 1 release

- ✅ Requirements are clear and testable
- ✅ Epics are logically sequential (1 → 2 → 3 → 4)
- ✅ Stories are sized for single-agent completion (2-4 hours each)
- ✅ Acceptance criteria are specific and measurable
- ✅ Technical assumptions are documented
- ✅ Performance constraints are explicit (<5% overhead)
- ✅ Compliance with AIOX Constitution verified (Article IV)
- ✅ Dependencies on other systems identified (ADE Recovery System, etc.)

---

## Next Steps

### For @architect (Aria)

Review this PRD and produce a Technical Architecture document including:

1. **Detailed system design:** Component interactions, data flow, API specifications
2. **PostgreSQL schema:** Complete DDL with indices and foreign keys
3. **Event schema examples:** Full JSON structure for each event type
4. **Deployment architecture:** How Collector, Dashboard, and CLI communicate
5. **Integration points:** Exactly where hooks are inserted in AIOX CLI
6. **Scalability roadmap:** Strategy for growing from 2.5K to 25K+ events/day

### For @sm (River - Scrum Master)

Once PRD is approved and Architecture is complete, break each Epic into detailed tasks:

1. **Epic 1 task breakdown:** Subtasks for each story (UI, API, DB, testing)
2. **Task dependencies:** Identify blocking relationships
3. **Test strategy:** What tests validate each requirement
4. **Definition of Done:** Checklist for each task completion

### For @dev (Dex - Implementation)

After @sm produces tasks, begin implementation:

1. **Story 1.1 priority:** Get @dev instrumentation working first (gating other stories)
2. **Testing focus:** Performance overhead validation is critical
3. **Integration points:** Work closely with @architect on hook placement

### Immediate Actions (Next 48 Hours)

1. **@architect:** Review PRD and confirm technical stack; raise questions via handoff
2. **@pm (Morgan):** Socialize PRD with stakeholders (@po Pax, @devops Gage) for buy-in
3. **@sm (River):** Prepare to receive approved PRD for task breakdown

---

**Document Status:** ✅ Ready for Architecture Review
**Next Review Date:** 2026-03-17 (after @architect design complete)
**Author:** Morgan (Product Manager, Strategist)
