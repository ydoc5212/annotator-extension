// Performance monitoring utilities for diagnosing Reddit slowness

interface PerfTiming {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: any;
}

class PerformanceMonitor {
  private timings: PerfTiming[] = [];
  private enabled: boolean = true;
  private maxTimings: number = 1000; // Prevent memory leak

  mark(operation: string, metadata?: any) {
    const start = performance.now();

    return {
      end: () => {
        if (!this.enabled) return;

        const duration = performance.now() - start;

        // Add to timings array
        this.timings.push({ operation, duration, timestamp: Date.now(), metadata });

        // Trim if too large
        if (this.timings.length > this.maxTimings) {
          this.timings = this.timings.slice(-this.maxTimings);
        }

        // Log slow operations
        if (duration > 10) {
          console.warn(`[PERF SLOW] ${operation}: ${duration.toFixed(2)}ms`, metadata || '');
        }

        return duration;
      }
    };
  }

  summary() {
    const grouped = this.timings.reduce((acc, t) => {
      acc[t.operation] = acc[t.operation] || [];
      acc[t.operation].push(t.duration);
      return acc;
    }, {} as Record<string, number[]>);

    const summary = Object.entries(grouped).map(([operation, durations]) => ({
      operation,
      count: durations.length,
      avg: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) + 'ms',
      max: Math.max(...durations).toFixed(2) + 'ms',
      min: Math.min(...durations).toFixed(2) + 'ms',
      total: durations.reduce((a, b) => a + b, 0).toFixed(2) + 'ms',
      p95: this.percentile(durations, 95).toFixed(2) + 'ms',
    }));

    console.table(summary);
    return summary;
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  clear() {
    this.timings = [];
    console.log('[PERF] Cleared all timings');
  }

  disable() {
    this.enabled = false;
    console.log('[PERF] Monitoring disabled');
  }

  enable() {
    this.enabled = true;
    console.log('[PERF] Monitoring enabled');
  }

  getTimings() {
    return this.timings;
  }

  // Analyze XPath complexity
  analyzeXPath(xpath: string) {
    const depth = (xpath.match(/\//g) || []).length;
    const length = xpath.length;
    const hasPredicates = xpath.includes('[');

    return {
      depth,
      length,
      hasPredicates,
      complexity: depth * (hasPredicates ? 1.5 : 1), // Simple complexity score
    };
  }
}

// Create singleton instance
export const perf = new PerformanceMonitor();

// Expose to window for console access
declare global {
  interface Window {
    annotatorPerf: PerformanceMonitor;
  }
}

if (typeof window !== 'undefined') {
  window.annotatorPerf = perf;
}

// Helper to detect if we're on Reddit
export function isReddit(): boolean {
  return window.location.hostname.includes('reddit.com');
}

// Helper to get DOM depth of element
export function getDOMDepth(element: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = element;

  while (current && current.parentElement) {
    depth++;
    current = current.parentElement;

    // Sanity limit
    if (depth > 100) break;
  }

  return depth;
}

// Helper to analyze page structure
export function analyzePageStructure() {
  const allElements = document.querySelectorAll('*');
  const depths = Array.from(allElements).map(el => getDOMDepth(el as HTMLElement));

  const analysis = {
    totalElements: allElements.length,
    maxDepth: Math.max(...depths),
    avgDepth: (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1),
    isReddit: isReddit(),
    url: window.location.href,
  };

  console.table(analysis);
  return analysis;
}

// Expose helper to console
if (typeof window !== 'undefined') {
  (window as any).analyzePageStructure = analyzePageStructure;
}
