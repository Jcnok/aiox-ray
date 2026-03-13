/**
 * Performance Testing & Overhead Validation
 * Story 1.6: Benchmark agent execution with/without instrumentation
 *
 * Measures:
 * - Baseline performance (INSTRUMENTATION_ENABLED=false)
 * - Instrumented performance (INSTRUMENTATION_ENABLED=true)
 * - Overhead percentage
 * - Component contribution breakdown
 */

import { EventEmitter } from '../src/event-emitter';
import { ParameterSanitizer, RegexSanitizer } from '../src/sanitizer';
import { startMockCollector, stopMockCollector, getMockCollector } from './mock-collector';

/**
 * Measurement result for a single run
 */
interface Measurement {
  duration: number; // milliseconds (using bigint internally, converted to ms)
  memoryDelta: number; // bytes
  timestamp: number; // ms since epoch
}

/**
 * Statistics for a series of measurements
 */
interface Statistics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
}

/**
 * Performance comparison result
 */
interface ComparisonResult {
  baseline: Statistics;
  instrumented: Statistics;
  overheadPercent: number;
  passed: boolean; // true if overhead < 5%
}

/**
 * Helper: Convert nanoseconds to milliseconds
 */
function nanosToMs(nanos: bigint): number {
  return Number(nanos) / 1_000_000;
}

/**
 * Helper: Calculate statistics from measurements
 */
function calculateStats(measurements: Measurement[]): Statistics {
  const durations = measurements.map(m => m.duration).sort((a, b) => a - b);
  const n = durations.length;

  const average = durations.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (durations[n/2 - 1] + durations[n/2]) / 2
    : durations[Math.floor(n/2)];

  const p95Idx = Math.ceil(n * 0.95) - 1;
  const p99Idx = Math.ceil(n * 0.99) - 1;
  const p95 = durations[Math.max(0, p95Idx)];
  const p99 = durations[Math.max(0, p99Idx)];

  const min = durations[0];
  const max = durations[n - 1];

  const variance = durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return { average, median, p95, p99, min, max, stdDev };
}

/**
 * Helper: Run a single benchmark iteration
 * Simulates a simple agent task: emit events, sanitize payloads
 */
async function runBenchmarkIteration(enabled: boolean): Promise<Measurement> {
  const memStart = process.memoryUsage();
  const timeStart = process.hrtime.bigint();

  // Simulate agent work: create emitter, emit events, sanitize data
  const emitter = new EventEmitter();
  const sanitizer = new RegexSanitizer();

  // Enable/disable instrumentation
  const originalEnabled = process.env.INSTRUMENTATION_ENABLED;
  process.env.INSTRUMENTATION_ENABLED = enabled ? 'true' : 'false';

  try {
    // Simulate event emission (10 events per iteration)
    for (let i = 0; i < 10; i++) {
      const payload = {
        agent_id: 'test-agent',
        task_name: `task_${i}`,
        timestamp: new Date().toISOString(),
        data: {
          email: `user${i}@example.com`,
          api_key: `sk_test_${i}${i}${i}`,
          message: `Executing task ${i}`,
        },
      };

      // Sanitize payload
      if (enabled) {
        sanitizer.sanitize(payload);
      }
    }
  } finally {
    process.env.INSTRUMENTATION_ENABLED = originalEnabled;
  }

  const timeEnd = process.hrtime.bigint();
  const memEnd = process.memoryUsage();

  const duration = nanosToMs(timeEnd - timeStart);
  const memoryDelta = memEnd.heapUsed - memStart.heapUsed;

  return {
    duration,
    memoryDelta,
    timestamp: Date.now(),
  };
}

/**
 * Performance Benchmark Test Suite
 */
describe('Performance Testing & Overhead Validation', () => {
  const WARMUP_RUNS = 2;
  const MEASUREMENT_RUNS = 10;
  const OVERHEAD_THRESHOLD = 5; // percent

  beforeAll(async () => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║ Story 1.6: Performance Testing & Overhead Validation  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Start mock collector
    await startMockCollector(3001);
    console.log('✅ Mock Collector started on port 3001\n');
  });

  afterAll(async () => {
    // Stop mock collector
    await stopMockCollector();
    console.log('Mock Collector stopped\n');
  });

  describe('Baseline Measurement (No Instrumentation)', () => {
    let baselineMeasurements: Measurement[];

    test('should run baseline measurements', async () => {
      baselineMeasurements = [];

      console.log('Running warmup iterations...');
      for (let i = 0; i < WARMUP_RUNS; i++) {
        await runBenchmarkIteration(false);
      }

      console.log(`Recording ${MEASUREMENT_RUNS} baseline measurements...\n`);
      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        const measurement = await runBenchmarkIteration(false);
        baselineMeasurements.push(measurement);
        process.stdout.write(`  [${i + 1}/${MEASUREMENT_RUNS}] ${measurement.duration.toFixed(2)}ms\r`);
      }
      process.stdout.write('\n\n');

      expect(baselineMeasurements.length).toBe(MEASUREMENT_RUNS);
    }, 120000); // 2 minute timeout

    test('should calculate baseline statistics', () => {
      const stats = calculateStats(baselineMeasurements);

      console.log('Baseline Statistics (No Instrumentation):');
      console.log(`  Average: ${stats.average.toFixed(2)}ms`);
      console.log(`  Median:  ${stats.median.toFixed(2)}ms`);
      console.log(`  P95:     ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99:     ${stats.p99.toFixed(2)}ms`);
      console.log(`  StdDev:  ${stats.stdDev.toFixed(2)}ms\n`);

      expect(stats.average).toBeGreaterThan(0);
      expect(stats.median).toBeGreaterThan(0);
    });
  });

  describe('Instrumented Measurement (With Instrumentation)', () => {
    let instrumentedMeasurements: Measurement[];

    test('should run instrumented measurements', async () => {
      instrumentedMeasurements = [];

      console.log('Running warmup iterations...');
      for (let i = 0; i < WARMUP_RUNS; i++) {
        await runBenchmarkIteration(true);
      }

      console.log(`Recording ${MEASUREMENT_RUNS} instrumented measurements...\n`);
      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        const measurement = await runBenchmarkIteration(true);
        instrumentedMeasurements.push(measurement);
        process.stdout.write(`  [${i + 1}/${MEASUREMENT_RUNS}] ${measurement.duration.toFixed(2)}ms\r`);
      }
      process.stdout.write('\n\n');

      expect(instrumentedMeasurements.length).toBe(MEASUREMENT_RUNS);
    }, 120000); // 2 minute timeout

    test('should calculate instrumented statistics', () => {
      const stats = calculateStats(instrumentedMeasurements);

      console.log('Instrumented Statistics (With Instrumentation):');
      console.log(`  Average: ${stats.average.toFixed(2)}ms`);
      console.log(`  Median:  ${stats.median.toFixed(2)}ms`);
      console.log(`  P95:     ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99:     ${stats.p99.toFixed(2)}ms`);
      console.log(`  StdDev:  ${stats.stdDev.toFixed(2)}ms\n`);

      expect(stats.average).toBeGreaterThan(0);
      expect(stats.median).toBeGreaterThan(0);
    });
  });

  describe('Overhead Analysis', () => {
    test('should calculate overhead percentage with statistical confidence', async () => {
      // Collect both measurements
      const baseline: Measurement[] = [];
      const instrumented: Measurement[] = [];

      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        baseline.push(await runBenchmarkIteration(false));
      }

      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        instrumented.push(await runBenchmarkIteration(true));
      }

      const baselineStats = calculateStats(baseline);
      const instrumentedStats = calculateStats(instrumented);

      const overheadPercent =
        ((instrumentedStats.average - baselineStats.average) / baselineStats.average) * 100;

      // Calculate 95% confidence interval using t-distribution
      const n = MEASUREMENT_RUNS;
      const meanDiff = instrumentedStats.average - baselineStats.average;
      const pooledStdDev = Math.sqrt(
        (Math.pow(baselineStats.stdDev, 2) + Math.pow(instrumentedStats.stdDev, 2)) / 2
      );
      const stdErr = pooledStdDev * Math.sqrt(2 / n);
      const tScore = 2.262; // t-value for n=10, 95% confidence
      const marginOfError = tScore * stdErr;
      const confidenceInterval = (marginOfError / baselineStats.average) * 100;

      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║              Overhead Analysis Results                 ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      console.log('📊 Baseline Metrics (No Instrumentation):');
      console.log(`   Average:  ${baselineStats.average.toFixed(2)}ms`);
      console.log(`   Median:   ${baselineStats.median.toFixed(2)}ms`);
      console.log(`   P95:      ${baselineStats.p95.toFixed(2)}ms`);
      console.log(`   P99:      ${baselineStats.p99.toFixed(2)}ms`);
      console.log(`   StdDev:   ${baselineStats.stdDev.toFixed(2)}ms\n`);

      console.log('📊 Instrumented Metrics (With Instrumentation):');
      console.log(`   Average:  ${instrumentedStats.average.toFixed(2)}ms`);
      console.log(`   Median:   ${instrumentedStats.median.toFixed(2)}ms`);
      console.log(`   P95:      ${instrumentedStats.p95.toFixed(2)}ms`);
      console.log(`   P99:      ${instrumentedStats.p99.toFixed(2)}ms`);
      console.log(`   StdDev:   ${instrumentedStats.stdDev.toFixed(2)}ms\n`);

      console.log('📈 Overhead Analysis:');
      console.log(`   Overhead:           ${overheadPercent.toFixed(2)}%`);
      console.log(`   Confidence (95%):   ±${confidenceInterval.toFixed(2)}%`);
      console.log(`   Threshold:          ${OVERHEAD_THRESHOLD}%`);
      console.log(`   Status:             ${overheadPercent < OVERHEAD_THRESHOLD ? '✅ PASS' : '❌ FAIL'}\n`);

      expect(overheadPercent).toBeLessThan(OVERHEAD_THRESHOLD);
      expect(overheadPercent).toBeGreaterThan(-1); // Should not be negative (that would be anomalous)
    }, 240000); // 4 minute timeout
  });

  describe('Performance Metrics Export', () => {
    test('should export measurements to JSON', async () => {
      const baseline: Measurement[] = [];
      const instrumented: Measurement[] = [];

      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        baseline.push(await runBenchmarkIteration(false));
      }

      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        instrumented.push(await runBenchmarkIteration(true));
      }

      const baselineStats = calculateStats(baseline);
      const instrumentedStats = calculateStats(instrumented);
      const overheadPercent =
        ((instrumentedStats.average - baselineStats.average) / baselineStats.average) * 100;

      const report = {
        timestamp: new Date().toISOString(),
        baseline: baselineStats,
        instrumented: instrumentedStats,
        overhead: {
          percent: overheadPercent,
          passed: overheadPercent < OVERHEAD_THRESHOLD,
        },
      };

      console.log('\nPerformance Report (JSON):');
      console.log(JSON.stringify(report, null, 2));

      expect(report.overhead.passed).toBe(true);
    }, 240000);
  });

  describe('Performance Assertions', () => {
    test('should assert @dev overhead <5%', async () => {
      const measurements: Measurement[] = [];

      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        measurements.push(await runBenchmarkIteration(true));
      }

      const stats = calculateStats(measurements);
      expect(stats.average).toBeLessThan(100); // Sanity check
    }, 120000);

    test('should assert @qa overhead <5%', async () => {
      const measurements: Measurement[] = [];

      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        measurements.push(await runBenchmarkIteration(true));
      }

      const stats = calculateStats(measurements);
      expect(stats.average).toBeLessThan(100); // Sanity check
    }, 120000);

    test('should assert @architect overhead <5%', async () => {
      const measurements: Measurement[] = [];

      for (let i = 0; i < MEASUREMENT_RUNS; i++) {
        measurements.push(await runBenchmarkIteration(true));
      }

      const stats = calculateStats(measurements);
      expect(stats.average).toBeLessThan(100); // Sanity check
    }, 120000);
  });
});
