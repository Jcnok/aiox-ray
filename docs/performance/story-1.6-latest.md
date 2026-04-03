# Performance Test Results

**Date:** 2026-04-03T00:10:23.046Z
**Sample Size:** 10 runs per agent
**Warmup Runs:** 2

## Baseline (No Instrumentation)

| Agent | Avg (ms) | Median | P95 | P99 |
|-------|----------|--------|-----|-----|
| @dev | 498.88 | 501.58 | 535.84 | 535.84 |
| @qa | 679.23 | 676.36 | 736.55 | 736.55 |
| @architect | 661.04 | 656.83 | 728.95 | 728.95 |

## Instrumented (With Instrumentation)

| Agent | Avg (ms) | Median | P95 | P99 | Overhead |
|-------|----------|--------|-----|-----|----------|
| @dev | 485.22 | 484.93 | 509.13 | 509.13 | -2.74% |
| @qa | 669.04 | 666.61 | 698.57 | 698.57 | -1.50% |
| @architect | 671.85 | 668.17 | 710.60 | 710.60 | 1.64% |

## Status
✅ PASS - Threshold 5%

## Component Contribution

| Component | Time (ms) | % of Total | Avg (ms) |
|-----------|-----------|------------|----------|
| async_send | 1033.94 | 99.1% | 51.697 |
| skill_hooks | 4.70 | 0.5% | 0.235 |
| sanitization | 3.94 | 0.4% | 0.197 |
| agent_hooks | 1.07 | 0.1% | 0.054 |
| serialization | 0.16 | 0.0% | 0.008 |
