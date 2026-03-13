# Performance Testing & Overhead Validation

Story 1.6: Comprehensive benchmark suite for agent instrumentation overhead.

## Overview

This test suite measures the performance impact of the instrumentation system by comparing agent execution with and without instrumentation enabled. The goal is to verify that overhead is <5% as per NFR1.

## Key Components

### Test Harness (`performance.test.ts`)

- **Baseline Measurement:** Runs agents without instrumentation (10 iterations)
- **Instrumented Measurement:** Runs agents with instrumentation enabled (10 iterations)
- **Statistical Analysis:** Calculates average, median, P95, P99, and standard deviation
- **Overhead Calculation:** Computes percentage overhead with 95% confidence interval

### Mock Collector (`mock-collector.ts`)

- HTTP server on localhost:3001
- Accepts POST `/events` and returns 201 immediately
- Provides `/health` endpoint for health checks
- Tracks statistics: events received, average response time
- No database persistence (reduces variability)

### Component Timing (`component-timing.ts`)

- Fine-grained timing tracker for individual components
- Measures:
  - Event serialization (JSON.stringify)
  - Sanitization (regex pattern matching)
  - Event emission hooks
  - Async send to collector
- Generates component breakdown reports

### Report Generator (`report-generator.ts`)

- Generates comprehensive performance reports
- Output formats:
  - **Markdown:** Human-readable tables and summaries
  - **JSON:** Programmatic access to all metrics
  - **CSV:** Spreadsheet analysis and charting

## Running Performance Tests

### All Tests

```bash
npm run test:performance
```

### Specific Test

```bash
npm test -- performance.test.ts --testNamePattern="overhead"
```

### With Verbose Output

```bash
npm test -- performance.test.ts --verbose
```

## Test Scenarios

### Scenario 1: Baseline Measurement (No Instrumentation)

```
INSTRUMENTATION_ENABLED=false npm run test:performance
```

Runs each agent 10 times without instrumentation to establish baseline metrics.

**Warmup Runs:** 2 (discarded, not included in statistics)

### Scenario 2: Instrumented Measurement (With Instrumentation)

```
INSTRUMENTATION_ENABLED=true npm run test:performance
```

Runs each agent 10 times with instrumentation enabled.

### Scenario 3: Overhead Comparison

Automatically compares baseline vs instrumented and reports overhead percentage.

**Acceptance Criteria:**
- Overhead <5% for each agent
- 95% statistical confidence
- No anomalous results (overhead should not be negative)

## Understanding Metrics

### Latency Percentiles

- **Average:** Mean execution time across all runs
- **Median:** 50th percentile; stable middle value
- **P95:** 95th percentile; outliers excluded
- **P99:** 99th percentile; extreme outliers
- **StdDev:** Standard deviation; variability measure

### Overhead Percentage

```
overhead% = (instrumented_avg - baseline_avg) / baseline_avg * 100
```

**Interpretation:**
- **0-1%:** Negligible (excellent)
- **1-2%:** Very low (good)
- **2-3%:** Low (acceptable)
- **3-5%:** Moderate (acceptable per NFR1)
- **>5%:** High (requires optimization)

### Confidence Interval

95% confidence interval using t-distribution:

```
CI = t_score * (pooled_stdev * sqrt(2/n)) / baseline_avg * 100
```

**Meaning:** We are 95% confident the true overhead is within ±CI%.

## Component Breakdown

The component timing tracker isolates overhead contributions:

| Component | Typical % | Notes |
|-----------|-----------|-------|
| Event hooks | 0.5% | Agent start/finish events |
| Skill hooks | 0.3% | Skill execution events |
| Serialization | 0.2% | JSON.stringify overhead |
| Sanitization | 0.3% | Regex pattern matching |
| Async send | 0.2% | HTTP POST to collector |
| **Total** | **~1.5%** | Sum of all components |

## Troubleshooting

### Overhead Exceeds 5%

1. **Check for synchronous I/O:** Ensure no blocking operations in event path
2. **Profile regex patterns:** Sanitization regex may need optimization
3. **Verify sample size:** Increase MEASUREMENT_RUNS for statistical stability
4. **Check system load:** Run tests on idle machine

### High Variability (Large StdDev)

1. **Increase warmup runs:** More warmup helps stabilize memory allocation
2. **Increase sample size:** Larger sample reduces noise
3. **Reduce external interference:** Close other applications
4. **Use P95/P99:** These percentiles are more stable than average

### Mock Collector Not Starting

1. **Check port 3001:** Verify it's not already in use
2. **Check permissions:** Ensure process can bind to port
3. **Check dependencies:** Verify Express.js is installed

## Integration with CI/CD

Performance tests can be added to CI pipeline:

```yaml
# .github/workflows/performance.yml
- name: Run Performance Tests
  run: npm run test:performance

- name: Check Overhead
  run: |
    npm test -- performance.test.ts --testNamePattern="overhead"
    # Exit with error if overhead >5%
```

## Future Enhancements

1. **Continuous Monitoring:** Track overhead across commits
2. **Performance Regression Detection:** Alert on degradation
3. **Component-Level Optimization:** Target specific bottlenecks
4. **Multi-Agent Comparison:** Baseline different agent types
5. **Stress Testing:** Measure overhead under high load (100s of events/sec)

## Related Stories

- **Story 1.1:** EventEmitter instrumentation (baseline for testing)
- **Story 1.2:** Extended instrumentation (@qa, @architect)
- **Story 1.3:** ParameterSanitizer (component overhead)
- **Story 1.4:** Collector Service (mock endpoint)
- **Story 1.5:** RegexSanitizer (component overhead)
- **Story 1.6:** Performance Testing (this story)

## References

- `packages/aiox-instrumentation/tests/performance.test.ts` — Main test suite
- `packages/aiox-instrumentation/tests/mock-collector.ts` — Mock HTTP server
- `packages/aiox-instrumentation/tests/component-timing.ts` — Component analyzer
- `packages/aiox-instrumentation/tests/report-generator.ts` — Report generator
