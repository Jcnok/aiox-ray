/**
 * Performance Report Generator
 * Story 1.6: Generate comprehensive benchmark reports
 *
 * Outputs:
 * - Markdown report with tables
 * - JSON report for programmatic access
 * - CSV export for spreadsheet analysis
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Performance report data
 */
export interface PerformanceReport {
  timestamp: string;
  testName: string;
  sampleSize: number;
  warmupRuns: number;
  baseline: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    stdDev: number;
  };
  instrumented: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    stdDev: number;
  };
  overhead: {
    percent: number;
    threshold: number;
    passed: boolean;
    confidenceInterval: number;
  };
  components?: Array<{
    name: string;
    timeMs: number;
    percentOfTotal: number;
    averageMs: number;
  }>;
}

/**
 * Report generator
 */
export class ReportGenerator {
  private report: PerformanceReport;
  private outputDir: string;

  constructor(report: PerformanceReport, outputDir: string = './results') {
    this.report = report;
    this.outputDir = outputDir;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Generate markdown report
   */
  generateMarkdown(): string {
    const { report } = this;
    const timestamp = new Date(report.timestamp).toISOString();

    let md = '# Performance Test Results\n\n';
    md += `**Date:** ${timestamp}\n`;
    md += `**Sample Size:** ${report.sampleSize} runs per configuration\n`;
    md += `**Warmup Runs:** ${report.warmupRuns}\n\n`;

    md += '## Baseline (No Instrumentation)\n\n';
    md += '| Metric | Value |\n';
    md += '|--------|-------|\n';
    md += `| Average | ${report.baseline.average.toFixed(2)}ms |\n`;
    md += `| Median | ${report.baseline.median.toFixed(2)}ms |\n`;
    md += `| P95 | ${report.baseline.p95.toFixed(2)}ms |\n`;
    md += `| P99 | ${report.baseline.p99.toFixed(2)}ms |\n`;
    md += `| Min | ${report.baseline.min.toFixed(2)}ms |\n`;
    md += `| Max | ${report.baseline.max.toFixed(2)}ms |\n`;
    md += `| StdDev | ${report.baseline.stdDev.toFixed(2)}ms |\n\n`;

    md += '## Instrumented (With Instrumentation)\n\n';
    md += '| Metric | Value |\n';
    md += '|--------|-------|\n';
    md += `| Average | ${report.instrumented.average.toFixed(2)}ms |\n`;
    md += `| Median | ${report.instrumented.median.toFixed(2)}ms |\n`;
    md += `| P95 | ${report.instrumented.p95.toFixed(2)}ms |\n`;
    md += `| P99 | ${report.instrumented.p99.toFixed(2)}ms |\n`;
    md += `| Min | ${report.instrumented.min.toFixed(2)}ms |\n`;
    md += `| Max | ${report.instrumented.max.toFixed(2)}ms |\n`;
    md += `| StdDev | ${report.instrumented.stdDev.toFixed(2)}ms |\n\n`;

    md += '## Overhead Analysis\n\n';
    md += `**Overhead:** ${report.overhead.percent.toFixed(2)}%\n`;
    md += `**Threshold:** ${report.overhead.threshold}%\n`;
    md += `**95% Confidence Interval:** ±${report.overhead.confidenceInterval.toFixed(2)}%\n`;
    md += `**Status:** ${report.overhead.passed ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (report.components && report.components.length > 0) {
      md += '## Component Breakdown\n\n';
      md += '| Component | Time (ms) | % of Total | Avg (ms) |\n';
      md += '|-----------|-----------|-----------|----------|\n';

      for (const comp of report.components) {
        md += `| ${comp.name} | ${comp.timeMs.toFixed(2)} | ${comp.percentOfTotal.toFixed(1)} | ${comp.averageMs.toFixed(3)} |\n`;
      }
      md += '\n';
    }

    return md;
  }

  /**
   * Generate JSON report
   */
  generateJSON(): string {
    return JSON.stringify(this.report, null, 2);
  }

  /**
   * Generate CSV export
   */
  generateCSV(): string {
    const { report } = this;

    let csv = 'Metric,Baseline,Instrumented,Difference\n';
    csv += `Average (ms),${report.baseline.average.toFixed(2)},${report.instrumented.average.toFixed(2)},${(report.instrumented.average - report.baseline.average).toFixed(2)}\n`;
    csv += `Median (ms),${report.baseline.median.toFixed(2)},${report.instrumented.median.toFixed(2)},${(report.instrumented.median - report.baseline.median).toFixed(2)}\n`;
    csv += `P95 (ms),${report.baseline.p95.toFixed(2)},${report.instrumented.p95.toFixed(2)},${(report.instrumented.p95 - report.baseline.p95).toFixed(2)}\n`;
    csv += `P99 (ms),${report.baseline.p99.toFixed(2)},${report.instrumented.p99.toFixed(2)},${(report.instrumented.p99 - report.baseline.p99).toFixed(2)}\n`;
    csv += `StdDev (ms),${report.baseline.stdDev.toFixed(2)},${report.instrumented.stdDev.toFixed(2)},${(report.instrumented.stdDev - report.baseline.stdDev).toFixed(2)}\n\n`;

    csv += `Overhead (%),${report.overhead.percent.toFixed(2)}\n`;
    csv += `Threshold (%),${report.overhead.threshold}\n`;
    csv += `Passed,${report.overhead.passed ? 'YES' : 'NO'}\n`;

    return csv;
  }

  /**
   * Save reports to disk
   */
  async save(): Promise<{ markdown: string; json: string; csv: string }> {
    const timestamp = new Date(this.report.timestamp).toISOString().replace(/[:.]/g, '-');
    const baseName = `performance-${timestamp}`;

    const markdownContent = this.generateMarkdown();
    const jsonContent = this.generateJSON();
    const csvContent = this.generateCSV();

    const markdownPath = path.join(this.outputDir, `${baseName}.md`);
    const jsonPath = path.join(this.outputDir, `${baseName}.json`);
    const csvPath = path.join(this.outputDir, `${baseName}.csv`);

    fs.writeFileSync(markdownPath, markdownContent);
    fs.writeFileSync(jsonPath, jsonContent);
    fs.writeFileSync(csvPath, csvContent);

    console.log(`\n📄 Reports saved:`);
    console.log(`   Markdown: ${markdownPath}`);
    console.log(`   JSON:     ${jsonPath}`);
    console.log(`   CSV:      ${csvPath}\n`);

    return {
      markdown: markdownPath,
      json: jsonPath,
      csv: csvPath,
    };
  }
}
