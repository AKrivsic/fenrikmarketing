/**
 * Phase 6G — stable video-worker process identity (does not replace lease owner).
 */

import { hostname } from "node:os";
import { randomBytes } from "node:crypto";

let cached: string | null = null;

export function getWorkerInstanceId(): string {
  if (cached) return cached;
  const fromEnv = process.env.VIDEO_WORKER_INSTANCE_ID?.trim();
  if (fromEnv) {
    cached = fromEnv;
    return cached;
  }
  const host = hostname() || "worker";
  const pid = typeof process.pid === "number" ? String(process.pid) : "0";
  const suffix = randomBytes(4).toString("hex");
  cached = `${host}-${pid}-${suffix}`;
  return cached;
}
