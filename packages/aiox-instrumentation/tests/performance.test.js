/**
 * Performance Testing & Overhead Validation
 * Story 1.6: benchmark de execução com/sem instrumentação
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const { EventEmitter } = require('../src/event-emitter');
const { SkillHook } = require('../src/skill-hook');
const { RegexSanitizer } = require('../src/sanitizer');
const {
  initializeDevAgentInstrumentation,
  executeDevAgentWithInstrumentation,
  initializeQAAgentInstrumentation,
  executeQAAgentWithInstrumentation,
  initializeArchitectAgentInstrumentation,
  executeArchitectAgentWithInstrumentation,
} = require('../src');

const AGENTS = ['dev', 'qa', 'architect'];
const MOCK_PORT = Number(process.env.PERF_COLLECTOR_PORT || 3001);
const WARMUP_RUNS = Number(process.env.PERF_WARMUP_RUNS || 2);
const MEASUREMENT_RUNS = Number(process.env.PERF_MEASUREMENT_RUNS || 10);
const OVERHEAD_THRESHOLD = Number(process.env.PERF_OVERHEAD_THRESHOLD || 5);
const WORK_ITERATIONS = Number(process.env.PERF_WORK_ITERATIONS || 18000000);
const COMPONENT_RUNS = Number(process.env.PERF_COMPONENT_RUNS || 20);

const STANDARD_TASK_INPUT =
  'Standard benchmark task: analyze code changes, run validations, summarize results.';

const testResults = {
  passed: 0,
  failed: 0,
  startedAt: Date.now(),
};

const AGENT_RUNNERS = {
  dev: {
    init: initializeDevAgentInstrumentation,
    exec: executeDevAgentWithInstrumentation,
  },
  qa: {
    init: initializeQAAgentInstrumentation,
    exec: executeQAAgentWithInstrumentation,
  },
  architect: {
    init: initializeArchitectAgentInstrumentation,
    exec: executeArchitectAgentWithInstrumentation,
  },
};

class MockCollector {
  constructor(port = 3001) {
    this.port = port;
    this.server = null;
    this.stats = {
      eventsReceived: 0,
      requestsReceived: 0,
      totalBytes: 0,
      totalResponseTimeMs: 0,
      averageResponseTimeMs: 0,
      lastReceivedAt: null,
    };
  }

  async start() {
    if (this.server) return;

    await new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        if (req.method === 'POST' && req.url === '/events') {
          const start = Date.now();
          let body = '';

          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', () => {
            this.stats.requestsReceived += 1;
            this.stats.totalBytes += Buffer.byteLength(body);
            this.stats.lastReceivedAt = new Date().toISOString();

            try {
              const parsed = JSON.parse(body);
              if (Array.isArray(parsed)) {
                this.stats.eventsReceived += parsed.length;
              } else {
                this.stats.eventsReceived += 1;
              }
            } catch {
              this.stats.eventsReceived += 1;
            }

            const elapsed = Date.now() - start;
            this.stats.totalResponseTimeMs += elapsed;
            this.stats.averageResponseTimeMs =
              this.stats.totalResponseTimeMs / this.stats.requestsReceived;

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'accepted',
                event_id: `mock-${Date.now()}`,
              })
            );
          });

          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
      });

      this.server.on('error', reject);
      this.server.listen(this.port, () => resolve());
    });
  }

  async stop() {
    if (!this.server) return;

    await new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.server = null;
  }

  resetStats() {
    this.stats = {
      eventsReceived: 0,
      requestsReceived: 0,
      totalBytes: 0,
      totalResponseTimeMs: 0,
      averageResponseTimeMs: 0,
      lastReceivedAt: null,
    };
  }

  getStats() {
    return { ...this.stats };
  }
}

function assert(condition, message) {
  if (!condition) {
    testResults.failed += 1;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }

  testResults.passed += 1;
  console.log(`✅ PASS: ${message}`);
}

function nanosToMs(nanos) {
  return Number(nanos) / 1_000_000;
}

function percentileFromSorted(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const average = sorted.reduce((sum, v) => sum + v, 0) / n;
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const p95 = percentileFromSorted(sorted, 0.95);
  const p99 = percentileFromSorted(sorted, 0.99);
  const min = sorted[0];
  const max = sorted[n - 1];

  const variance =
    sorted.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) /
    Math.max(1, n - 1);
  const stdDev = Math.sqrt(variance);

  return { average, median, p95, p99, min, max, stdDev };
}

function tScore95(sampleSize) {
  const table = {
    2: 12.706,
    3: 4.303,
    4: 3.182,
    5: 2.776,
    6: 2.571,
    7: 2.447,
    8: 2.365,
    9: 2.306,
    10: 2.262,
    11: 2.228,
    12: 2.201,
    13: 2.179,
    14: 2.160,
    15: 2.145,
    16: 2.131,
    17: 2.120,
    18: 2.110,
    19: 2.101,
    20: 2.093,
    21: 2.086,
    22: 2.080,
    23: 2.074,
    24: 2.069,
    25: 2.064,
    26: 2.060,
    27: 2.056,
    28: 2.052,
    29: 2.048,
    30: 2.045,
  };

  if (sampleSize <= 1) return 0;
  if (sampleSize <= 30) return table[sampleSize] || 2.262;
  return 1.96;
}

function confidenceInterval95(samples) {
  if (!samples.length) return 0;

  const s = stats(samples);
  const n = samples.length;
  const t = tScore95(n);
  const stdErr = s.stdDev / Math.sqrt(n);

  return t * stdErr;
}

function runStandardWorkload(agentId) {
  const seed = agentId === 'dev' ? 1.11 : agentId === 'qa' ? 1.37 : 1.73;

  let acc = 0;
  for (let i = 1; i <= WORK_ITERATIONS; i++) {
    const x = Math.sqrt(i * seed);
    const y = Math.log1p(i) * 0.33;
    acc += x + y;
  }

  // Evita eliminação agressiva pelo JIT
  if (acc === Number.MIN_SAFE_INTEGER) {
    console.log('unreachable');
  }

  return acc;
}

function buildSensitivePayload(agentId, runIndex, workloadResult) {
  return {
    agent_id: agentId,
    run: runIndex,
    task: STANDARD_TASK_INPUT,
    timestamp: new Date().toISOString(),
    api_key: 'sk_test_abcdefghijklmnopqrstuvwxyz123456',
    token: 'Bearer abcdefghijklmnopqrstuvxyz0123456789',
    email: 'benchmark@example.com',
    nested: {
      password: 'super-secret-password',
      session_token: `session_${runIndex}_${Date.now()}`,
    },
    metrics: {
      result: workloadResult,
      status: 'success',
    },
  };
}

async function measureAgentExecution(agentId, enabled, runIndex) {
  const memBefore = process.memoryUsage().heapUsed;
  const cpuBefore = process.cpuUsage();

  const previousFlag = process.env.INSTRUMENTATION_ENABLED;
  const previousCollectorUrl = process.env.COLLECTOR_URL;
  process.env.INSTRUMENTATION_ENABLED = enabled ? 'true' : 'false';
  process.env.COLLECTOR_URL = `http://localhost:${MOCK_PORT}`;

  const runner = AGENT_RUNNERS[agentId];
  const emitter = runner.init();

  const start = process.hrtime.bigint();

  await runner.exec(emitter, STANDARD_TASK_INPUT, async () => {
    runStandardWorkload(agentId);
    return `${agentId}-ok-${runIndex}`;
  });

  const end = process.hrtime.bigint();

  const flushStart = process.hrtime.bigint();
  await emitter.flush();
  const flushEnd = process.hrtime.bigint();

  process.env.INSTRUMENTATION_ENABLED = previousFlag;
  process.env.COLLECTOR_URL = previousCollectorUrl;

  const memAfter = process.memoryUsage().heapUsed;
  const cpuAfter = process.cpuUsage(cpuBefore);

  return {
    durationMs: nanosToMs(end - start),
    memoryDelta: memAfter - memBefore,
    cpuUserMicros: cpuAfter.user,
    cpuSystemMicros: cpuAfter.system,
    asyncSendMs: nanosToMs(flushEnd - flushStart),
  };
}

async function collectPairedMeasurements(agentId) {
  // Warmup pareado para reduzir viés de JIT/CPU scaling
  for (let i = 0; i < WARMUP_RUNS; i++) {
    await measureAgentExecution(agentId, false, i);
    await measureAgentExecution(agentId, true, i);
  }

  const baselineRuns = [];
  const instrumentedRuns = [];
  const overheadSamples = [];

  for (let i = 0; i < MEASUREMENT_RUNS; i++) {
    const baseline = await measureAgentExecution(agentId, false, i + 1);
    const instrumented = await measureAgentExecution(agentId, true, i + 1);

    baselineRuns.push(baseline);
    instrumentedRuns.push(instrumented);

    const overheadPercent =
      ((instrumented.durationMs - baseline.durationMs) / baseline.durationMs) * 100;
    overheadSamples.push(overheadPercent);

    process.stdout.write(
      `  [${agentId}] [${i + 1}/${MEASUREMENT_RUNS}] baseline=${baseline.durationMs.toFixed(
        2
      )}ms instrumented=${instrumented.durationMs.toFixed(2)}ms overhead=${overheadPercent.toFixed(
        2
      )}%\r`
    );
  }

  process.stdout.write('\n');

  return {
    baselineRuns,
    instrumentedRuns,
    overheadSamples,
  };
}

function summarizeRuns(runs) {
  return {
    duration: stats(runs.map((r) => r.durationMs)),
    memoryDelta: stats(runs.map((r) => r.memoryDelta)),
    cpuUserMicros: stats(runs.map((r) => r.cpuUserMicros)),
    cpuSystemMicros: stats(runs.map((r) => r.cpuSystemMicros)),
    asyncSendMs: stats(runs.map((r) => r.asyncSendMs || 0)),
  };
}

async function measureComponentBreakdown(mockCollectorUrl) {
  const components = {
    agent_hooks: 0,
    skill_hooks: 0,
    serialization: 0,
    sanitization: 0,
    async_send: 0,
  };

  const payload = buildSensitivePayload('dev', 999, 123.456);
  const sanitizer = new RegexSanitizer();

  const previousCollectorUrl = process.env.COLLECTOR_URL;
  const previousFlag = process.env.INSTRUMENTATION_ENABLED;
  process.env.COLLECTOR_URL = mockCollectorUrl;
  process.env.INSTRUMENTATION_ENABLED = 'true';

  // agent_hooks
  const hookEmitter = initializeDevAgentInstrumentation();
  for (let i = 0; i < COMPONENT_RUNS; i++) {
    const start = process.hrtime.bigint();
    await executeDevAgentWithInstrumentation(hookEmitter, 'component-benchmark', async () => 'ok');
    const end = process.hrtime.bigint();
    components.agent_hooks += nanosToMs(end - start);
  }
  await hookEmitter.flush();

  // skill_hooks
  const skillEmitter = new EventEmitter({ collectorUrl: mockCollectorUrl, debug: false });
  const skillHook = new SkillHook(skillEmitter, {
    agentId: 'dev',
    executionId: uuidv4(),
    debug: false,
  });
  const wrappedSkill = skillHook.wrap('benchmark.skill', async (input) => input.value);

  for (let i = 0; i < COMPONENT_RUNS; i++) {
    const start = process.hrtime.bigint();
    await wrappedSkill({
      value: i,
      token: 'Bearer skill_token_1234',
      api_key: 'sk_test_skill_abc',
    });
    const end = process.hrtime.bigint();
    components.skill_hooks += nanosToMs(end - start);
  }
  await skillEmitter.flush();

  // serialization
  for (let i = 0; i < COMPONENT_RUNS; i++) {
    const start = process.hrtime.bigint();
    JSON.stringify(payload);
    const end = process.hrtime.bigint();
    components.serialization += nanosToMs(end - start);
  }

  // sanitization
  for (let i = 0; i < COMPONENT_RUNS; i++) {
    const start = process.hrtime.bigint();
    sanitizer.sanitize(payload);
    const end = process.hrtime.bigint();
    components.sanitization += nanosToMs(end - start);
  }

  // async_send
  const sendEmitter = new EventEmitter({ collectorUrl: mockCollectorUrl, debug: false });
  for (let i = 0; i < COMPONENT_RUNS; i++) {
    sendEmitter.emit('agent.started', {
      agent_id: 'dev',
      execution_id: uuidv4(),
      input: 'async-send-benchmark',
    });

    const start = process.hrtime.bigint();
    await sendEmitter.flush();
    const end = process.hrtime.bigint();
    components.async_send += nanosToMs(end - start);
  }

  process.env.COLLECTOR_URL = previousCollectorUrl;
  process.env.INSTRUMENTATION_ENABLED = previousFlag;

  const total = Object.values(components).reduce((sum, v) => sum + v, 0) || 1;

  return Object.entries(components)
    .map(([name, timeMs]) => ({
      name,
      timeMs,
      percentOfTotal: (timeMs / total) * 100,
      averageMs: timeMs / COMPONENT_RUNS,
    }))
    .sort((a, b) => b.percentOfTotal - a.percentOfTotal);
}

function renderMarkdownReport(report) {
  let md = '# Performance Test Results\n\n';
  md += `**Date:** ${report.timestamp}\n`;
  md += `**Sample Size:** ${MEASUREMENT_RUNS} runs per agent\n`;
  md += `**Warmup Runs:** ${WARMUP_RUNS}\n\n`;

  md += '## Baseline (No Instrumentation)\n\n';
  md += '| Agent | Avg (ms) | Median | P95 | P99 |\n';
  md += '|-------|----------|--------|-----|-----|\n';
  for (const agent of AGENTS) {
    const s = report.baselineByAgent[agent].duration;
    md += `| @${agent} | ${s.average.toFixed(2)} | ${s.median.toFixed(2)} | ${s.p95.toFixed(
      2
    )} | ${s.p99.toFixed(2)} |\n`;
  }

  md += '\n## Instrumented (With Instrumentation)\n\n';
  md += '| Agent | Avg (ms) | Median | P95 | P99 | Overhead |\n';
  md += '|-------|----------|--------|-----|-----|----------|\n';
  for (const agent of AGENTS) {
    const s = report.instrumentedByAgent[agent].duration;
    md += `| @${agent} | ${s.average.toFixed(2)} | ${s.median.toFixed(2)} | ${s.p95.toFixed(
      2
    )} | ${s.p99.toFixed(2)} | ${report.overheadByAgent[agent].overheadPercent.toFixed(2)}% |\n`;
  }

  md += '\n## Status\n';
  md += `${report.combined.passed ? '✅ PASS' : '❌ FAIL'} - Threshold ${OVERHEAD_THRESHOLD}%\n\n`;

  md += '## Component Contribution\n\n';
  md += '| Component | Time (ms) | % of Total | Avg (ms) |\n';
  md += '|-----------|-----------|------------|----------|\n';
  for (const c of report.componentBreakdown) {
    md += `| ${c.name} | ${c.timeMs.toFixed(2)} | ${c.percentOfTotal.toFixed(1)}% | ${c.averageMs.toFixed(
      3
    )} |\n`;
  }

  return md;
}

function renderCsvReport(report) {
  const lines = [];
  lines.push('section,agent,metric,baseline,instrumented,overhead_percent');

  for (const agent of AGENTS) {
    const b = report.baselineByAgent[agent].duration;
    const i = report.instrumentedByAgent[agent].duration;
    const overhead = report.overheadByAgent[agent].overheadPercent;

    lines.push(
      `duration,@${agent},average,${b.average.toFixed(6)},${i.average.toFixed(6)},${overhead.toFixed(
        6
      )}`
    );
    lines.push(
      `duration,@${agent},median,${b.median.toFixed(6)},${i.median.toFixed(6)},${overhead.toFixed(
        6
      )}`
    );
    lines.push(
      `duration,@${agent},p95,${b.p95.toFixed(6)},${i.p95.toFixed(6)},${overhead.toFixed(6)}`
    );
    lines.push(
      `duration,@${agent},p99,${b.p99.toFixed(6)},${i.p99.toFixed(6)},${overhead.toFixed(6)}`
    );
  }

  lines.push('component,name,time_ms,percent_of_total,avg_ms');
  for (const c of report.componentBreakdown) {
    lines.push(
      `component,${c.name},${c.timeMs.toFixed(6)},${c.percentOfTotal.toFixed(6)},${c.averageMs.toFixed(
        6
      )}`
    );
  }

  return lines.join('\n') + '\n';
}

function saveReports(report) {
  const outputDir = path.join(__dirname, 'results');
  fs.mkdirSync(outputDir, { recursive: true });

  const stamp = report.timestamp.replace(/[:.]/g, '-');
  const baseName = `performance-${stamp}`;

  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const csvPath = path.join(outputDir, `${baseName}.csv`);
  const mdPath = path.join(outputDir, `${baseName}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(csvPath, renderCsvReport(report), 'utf8');
  fs.writeFileSync(mdPath, renderMarkdownReport(report), 'utf8');

  return { jsonPath, csvPath, mdPath };
}

async function runPerformanceTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║ Story 1.6: Performance Testing & Overhead Validation  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const mockCollector = new MockCollector(MOCK_PORT);
  await mockCollector.start();
  mockCollector.resetStats();

  try {
    const baselineRunsByAgent = {};
    const instrumentedRunsByAgent = {};
    const overheadSamplesByAgent = {};

    console.log('📊 Collecting Paired Measurements (Baseline vs Instrumented)\n');
    for (const agent of AGENTS) {
      const paired = await collectPairedMeasurements(agent);
      baselineRunsByAgent[agent] = paired.baselineRuns;
      instrumentedRunsByAgent[agent] = paired.instrumentedRuns;
      overheadSamplesByAgent[agent] = paired.overheadSamples;
    }

    const baselineByAgent = {};
    const instrumentedByAgent = {};
    const overheadByAgent = {};

    for (const agent of AGENTS) {
      baselineByAgent[agent] = summarizeRuns(baselineRunsByAgent[agent]);
      instrumentedByAgent[agent] = summarizeRuns(instrumentedRunsByAgent[agent]);

      const baselineAvg = baselineByAgent[agent].duration.average;
      const instrumentedAvg = instrumentedByAgent[agent].duration.average;
      const overheadPercent = ((instrumentedAvg - baselineAvg) / baselineAvg) * 100;

      overheadByAgent[agent] = {
        overheadPercent,
        confidenceInterval95: confidenceInterval95(overheadSamplesByAgent[agent]),
        p95: percentileFromSorted(
          [...overheadSamplesByAgent[agent]].sort((a, b) => a - b),
          0.95
        ),
        p99: percentileFromSorted(
          [...overheadSamplesByAgent[agent]].sort((a, b) => a - b),
          0.99
        ),
      };
    }

    const combinedBaseline = stats(
      AGENTS.flatMap((agent) => baselineRunsByAgent[agent].map((m) => m.durationMs))
    );
    const combinedInstrumented = stats(
      AGENTS.flatMap((agent) => instrumentedRunsByAgent[agent].map((m) => m.durationMs))
    );

    const combinedOverheadPercent =
      ((combinedInstrumented.average - combinedBaseline.average) / combinedBaseline.average) * 100;

    const combinedOverheadSamples = AGENTS.flatMap(
      (agent) => overheadSamplesByAgent[agent]
    );

    const combinedConfidenceInterval95 =
      confidenceInterval95(combinedOverheadSamples);

    const componentBreakdown = await measureComponentBreakdown(
      `http://localhost:${MOCK_PORT}`
    );

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              Overhead Analysis Results                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    for (const agent of AGENTS) {
      const b = baselineByAgent[agent].duration.average;
      const i = instrumentedByAgent[agent].duration.average;
      const o = overheadByAgent[agent].overheadPercent;
      const ci = overheadByAgent[agent].confidenceInterval95;

      console.log(
        `@${agent}: ${b.toFixed(2)}ms → ${i.toFixed(2)}ms | overhead ${o.toFixed(2)}%`
      );
      console.log(`       95% CI: ±${ci.toFixed(2)}%`);
    }

    console.log('\nCombined:');
    console.log(
      `  ${combinedBaseline.average.toFixed(2)}ms → ${combinedInstrumented.average.toFixed(2)}ms`
    );
    console.log(`  Overhead: ${combinedOverheadPercent.toFixed(2)}%`);
    console.log(`  95% CI: ±${combinedConfidenceInterval95.toFixed(2)}%`);
    console.log(`  Threshold: ${OVERHEAD_THRESHOLD}%\n`);

    const collectorStats = mockCollector.getStats();

    const report = {
      timestamp: new Date().toISOString(),
      story: '1.6',
      sampleSize: MEASUREMENT_RUNS,
      warmupRuns: WARMUP_RUNS,
      workloadIterations: WORK_ITERATIONS,
      thresholdPercent: OVERHEAD_THRESHOLD,
      baselineByAgent,
      instrumentedByAgent,
      overheadByAgent,
      combined: {
        baseline: combinedBaseline,
        instrumented: combinedInstrumented,
        overheadPercent: combinedOverheadPercent,
        confidenceInterval95: combinedConfidenceInterval95,
        passed: combinedOverheadPercent < OVERHEAD_THRESHOLD,
      },
      componentBreakdown,
      collector: collectorStats,
    };

    const saved = saveReports(report);

    for (const agent of AGENTS) {
      assert(
        overheadByAgent[agent].overheadPercent < OVERHEAD_THRESHOLD,
        `@${agent} overhead ${overheadByAgent[agent].overheadPercent.toFixed(2)}% should be < ${OVERHEAD_THRESHOLD}%`
      );
    }

    assert(
      combinedOverheadPercent < OVERHEAD_THRESHOLD,
      `Combined overhead ${combinedOverheadPercent.toFixed(2)}% should be < ${OVERHEAD_THRESHOLD}%`
    );

    console.log('Component breakdown:');
    for (const c of componentBreakdown) {
      console.log(
        `  - ${c.name}: ${c.timeMs.toFixed(2)}ms (${c.percentOfTotal.toFixed(1)}%)`
      );
    }

    if (componentBreakdown.length > 0) {
      console.log(
        `\nTop component: ${componentBreakdown[0].name} (${componentBreakdown[0].percentOfTotal.toFixed(1)}%)`
      );
    }

    console.log('\n📄 Reports saved:');
    console.log(`  JSON: ${saved.jsonPath}`);
    console.log(`  CSV:  ${saved.csvPath}`);
    console.log(`  MD:   ${saved.mdPath}`);

    console.log('\n📋 Quick summary:');
    console.log(
      JSON.stringify(
        {
          thresholdPercent: OVERHEAD_THRESHOLD,
          combinedOverheadPercent,
          dev: overheadByAgent.dev.overheadPercent,
          qa: overheadByAgent.qa.overheadPercent,
          architect: overheadByAgent.architect.overheadPercent,
          collectorEventsReceived: collectorStats.eventsReceived,
        },
        null,
        2
      )
    );
  } finally {
    await mockCollector.stop();
  }
}

runPerformanceTests()
  .then(() => {
    const elapsed = (Date.now() - testResults.startedAt) / 1000;

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              Test Summary                              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`Total assertions: ${testResults.passed + testResults.failed}`);
    console.log(`Passed:           ${testResults.passed} ✅`);
    console.log(`Failed:           ${testResults.failed} ${testResults.failed > 0 ? '❌' : ''}`);
    console.log(`Duration:         ${elapsed.toFixed(2)}s\n`);

    if (testResults.failed > 0) {
      process.exit(1);
    }

    console.log('✅ Performance suite passed!\n');
    process.exit(0);
  })
  .catch((error) => {
    const elapsed = (Date.now() - testResults.startedAt) / 1000;
    console.error(`\n❌ Performance suite failed: ${error.message || error}`);
    console.log(`Duration: ${elapsed.toFixed(2)}s`);
    process.exit(1);
  });
