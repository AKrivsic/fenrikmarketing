// Video Worker — in-process concurrency queue.
//
// The HTTP entrypoint accepts render jobs and returns 202 immediately, but the
// actual render pipeline (TTS, image generation, FFmpeg) is resource-heavy.
// Running every accepted job in parallel can spawn many FFmpeg processes at once
// and exhaust RAM/CPU, crashing the worker.
//
// This module bounds how many jobs run at the same time. Jobs over the limit
// wait in an in-memory FIFO queue and start as running jobs finish. No external
// queue, database, or scheduler is involved — this is a single-process MVP.

import type { WorkerPayload } from "@/lib/video-engine/schemas/workerPayloadSchema";
import {
  isJobCancelRequested,
  requestJobCancel,
} from "@/video-worker/cancellation";
import { runVideoJob } from "@/video-worker/jobRunner";

// How many render jobs may run concurrently. Defaults to 1 so the worker is safe
// by default; raise via env on hosts with enough RAM/CPU headroom.
function maxConcurrent(): number {
  const raw = Number(process.env.MAX_CONCURRENT_VIDEO_JOBS);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.floor(raw);
}

const MAX_CONCURRENT = maxConcurrent();

const pending: WorkerPayload[] = [];
let active = 0;

// Pulls the next queued job (if any) whenever there is free capacity, then runs
// it. A finished job — success OR failure — frees its slot and pumps the queue
// again, so one failing job can never stall the others.
function pump(): void {
  while (active < MAX_CONCURRENT && pending.length > 0) {
    const payload = pending.shift() as WorkerPayload;

    // Drop jobs cancelled while they waited in the in-memory queue.
    if (isJobCancelRequested(payload.video_job_id)) {
      console.log(
        "[video-worker:queue] job skipped (cancelled)",
        JSON.stringify({
          video_job_id: payload.video_job_id,
          active,
          queue_size: pending.length,
        }),
      );
      continue;
    }

    active += 1;

    console.log(
      "[video-worker:queue] job started",
      JSON.stringify({
        video_job_id: payload.video_job_id,
        active,
        queue_size: pending.length,
        max_concurrent: MAX_CONCURRENT,
      }),
    );

    void runVideoJob(payload)
      .catch((err: unknown) => {
        // runVideoJob already converts pipeline errors into a failed callback,
        // so reaching here is unexpected. Log and swallow so the queue survives.
        console.error(
          "[video-worker:queue] job runner rejected",
          JSON.stringify({
            video_job_id: payload.video_job_id,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      })
      .finally(() => {
        active -= 1;
        console.log(
          "[video-worker:queue] job finished",
          JSON.stringify({
            video_job_id: payload.video_job_id,
            active,
            queue_size: pending.length,
            max_concurrent: MAX_CONCURRENT,
          }),
        );
        pump();
      });
  }
}

// Accepts a job into the worker. Starts it immediately when there is free
// capacity, otherwise enqueues it to run when a slot opens up.
export function enqueueVideoJob(payload: WorkerPayload): void {
  console.log(
    "[video-worker:queue] job accepted",
    JSON.stringify({
      video_job_id: payload.video_job_id,
      active,
      queue_size: pending.length,
      max_concurrent: MAX_CONCURRENT,
    }),
  );

  if (isJobCancelRequested(payload.video_job_id)) {
    console.log(
      "[video-worker:queue] job rejected (already cancelled)",
      JSON.stringify({ video_job_id: payload.video_job_id }),
    );
    return;
  }

  if (active >= MAX_CONCURRENT) {
    pending.push(payload);
    console.log(
      "[video-worker:queue] job queued",
      JSON.stringify({
        video_job_id: payload.video_job_id,
        active,
        queue_size: pending.length,
        max_concurrent: MAX_CONCURRENT,
      }),
    );
    return;
  }

  pending.push(payload);
  pump();
}

/** Remove pending jobs and signal in-flight ones to abort at checkpoints. */
export function cancelQueuedVideoJobs(videoJobIds: string[]): string[] {
  const idSet = new Set(videoJobIds.filter(Boolean));
  if (idSet.size === 0) return [];

  const removed: string[] = [];
  for (let i = pending.length - 1; i >= 0; i -= 1) {
    const jobId = pending[i]?.video_job_id;
    if (!jobId || !idSet.has(jobId)) continue;
    pending.splice(i, 1);
    removed.push(jobId);
  }

  for (const jobId of idSet) {
    requestJobCancel(jobId);
  }

  console.log(
    "[video-worker:queue] cancel requested",
    JSON.stringify({
      requested: [...idSet],
      removed_from_pending: removed,
      queue_size: pending.length,
      active,
    }),
  );

  return [...idSet];
}

/** Test helper — current pending queue size. */
export function pendingVideoJobCount(): number {
  return pending.length;
}
