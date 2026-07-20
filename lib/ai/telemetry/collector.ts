import { AsyncLocalStorage } from "node:async_hooks";
import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";

export class TelemetryCollector {
  readonly steps: PipelineTelemetryStep[] = [];

  push(step: PipelineTelemetryStep): void {
    this.steps.push(step);
  }

  snapshot(): PipelineTelemetryStep[] {
    return [...this.steps];
  }
}

const storage = new AsyncLocalStorage<TelemetryCollector>();

export function getTelemetryCollector(): TelemetryCollector | undefined {
  return storage.getStore();
}

/**
 * Run `fn` with an active telemetry collector. Nested AI wrappers append steps
 * in chronological order. Safe when nested: outer session keeps collecting.
 */
export async function runWithTelemetrySession<T>(
  fn: (collector: TelemetryCollector) => Promise<T>,
): Promise<{ result: T; steps: PipelineTelemetryStep[] }> {
  const existing = storage.getStore();
  if (existing) {
    const result = await fn(existing);
    return { result, steps: existing.snapshot() };
  }
  const collector = new TelemetryCollector();
  const result = await storage.run(collector, () => fn(collector));
  return { result, steps: collector.snapshot() };
}

/** Record a fully-built step when a collector is active (no-op otherwise). */
export function recordTelemetryStep(step: PipelineTelemetryStep): void {
  storage.getStore()?.push(step);
}
