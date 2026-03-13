/**
 * Component Timing Breakdown for Performance Analysis
 * Story 1.6: Isolates and measures overhead of individual components
 *
 * Components:
 * - Event serialization (JSON.stringify)
 * - Sanitization (regex pattern matching)
 * - Event emission hooks
 * - Async send to collector
 */

/**
 * Component timing sample
 */
export interface TimingSample {
  component: string;
  duration: number; // milliseconds
  timestamp: number;
}

/**
 * Component timing aggregate
 */
export interface ComponentTiming {
  component: string;
  totalTime: number;
  averageTime: number;
  sampleCount: number;
  percentOfTotal: number;
}

/**
 * Timing tracker for component-level analysis
 */
export class TimingTracker {
  private samples: TimingSample[] = [];
  private startTime: bigint | null = null;
  private componentName: string | null = null;

  /**
   * Start timing a component
   */
  startComponent(name: string): void {
    this.componentName = name;
    this.startTime = process.hrtime.bigint();
  }

  /**
   * End timing the current component
   */
  endComponent(): void {
    if (!this.startTime || !this.componentName) {
      return;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - this.startTime) / 1_000_000; // Convert to ms

    this.samples.push({
      component: this.componentName,
      duration,
      timestamp: Date.now(),
    });

    this.startTime = null;
    this.componentName = null;
  }

  /**
   * Get all samples
   */
  getSamples(): TimingSample[] {
    return [...this.samples];
  }

  /**
   * Calculate component timings (aggregate)
   */
  getComponentTimings(): ComponentTiming[] {
    const componentMap = new Map<string, TimingSample[]>();

    // Group samples by component
    for (const sample of this.samples) {
      if (!componentMap.has(sample.component)) {
        componentMap.set(sample.component, []);
      }
      componentMap.get(sample.component)!.push(sample);
    }

    const totalTime = this.samples.reduce((sum, s) => sum + s.duration, 0);

    // Calculate timings per component
    const timings: ComponentTiming[] = [];
    for (const [component, samples] of componentMap.entries()) {
      const componentTotal = samples.reduce((sum, s) => sum + s.duration, 0);
      const averageTime = componentTotal / samples.length;
      const percentOfTotal = (componentTotal / totalTime) * 100;

      timings.push({
        component,
        totalTime: componentTotal,
        averageTime,
        sampleCount: samples.length,
        percentOfTotal,
      });
    }

    return timings.sort((a, b) => b.percentOfTotal - a.percentOfTotal);
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.samples = [];
    this.startTime = null;
    this.componentName = null;
  }

  /**
   * Print component breakdown report
   */
  printReport(): void {
    const timings = this.getComponentTimings();
    const totalTime = timings.reduce((sum, t) => sum + t.totalTime, 0);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           Component Timing Breakdown Analysis         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('Component                 | Time (ms) | % of Total | Avg');
    console.log('─────────────────────────────────────────────────────────');

    for (const timing of timings) {
      const percent = timing.percentOfTotal.toFixed(1).padStart(5);
      const total = timing.totalTime.toFixed(2).padStart(8);
      const avg = timing.averageTime.toFixed(3).padStart(8);
      const name = timing.component.padEnd(22);

      console.log(`${name} | ${total} | ${percent}% | ${avg}ms`);
    }

    console.log('─────────────────────────────────────────────────────────');
    console.log(`Total Time: ${totalTime.toFixed(2)}ms\n`);
  }
}

/**
 * Global timing tracker instance
 */
let globalTracker: TimingTracker | null = null;

/**
 * Get or create global tracker
 */
export function getGlobalTracker(): TimingTracker {
  if (!globalTracker) {
    globalTracker = new TimingTracker();
  }
  return globalTracker;
}

/**
 * Reset global tracker
 */
export function resetGlobalTracker(): void {
  globalTracker = new TimingTracker();
}
