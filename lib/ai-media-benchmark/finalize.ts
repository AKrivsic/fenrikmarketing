import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BoundedDownloadError,
  readResponseBodyBounded,
} from "@/lib/scene-video-attempts/boundedDownload";
import {
  AI_MEDIA_BENCHMARK_AUDIO_FILENAME,
  AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS,
  AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES,
  AI_MEDIA_BENCHMARK_VIDEO_FILENAME,
} from "@/lib/ai-media-benchmark/constants";
import type { AiMediaBenchmarkRunRow } from "@/lib/ai-media-benchmark/types";
import {
  buildAiMediaBenchmarkPath,
  STORAGE_BUCKETS,
} from "@/lib/api/storage";

export class BenchmarkDownloadTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`download_timeout_${timeoutMs}`);
    this.name = "BenchmarkDownloadTimeoutError";
  }
}

export function outputFilenameForRun(row: AiMediaBenchmarkRunRow): string {
  return row.test_type === "video"
    ? AI_MEDIA_BENCHMARK_VIDEO_FILENAME
    : AI_MEDIA_BENCHMARK_AUDIO_FILENAME;
}

export function expectedOutputPath(row: AiMediaBenchmarkRunRow): {
  bucket: string;
  path: string;
  folder: string;
  filename: string;
} | null {
  if (!row.project_id) return null;
  const filename = outputFilenameForRun(row);
  const path = buildAiMediaBenchmarkPath(row.project_id, row.id, filename);
  const slash = path.lastIndexOf("/");
  return {
    bucket: STORAGE_BUCKETS.videoRenders,
    path,
    folder: slash >= 0 ? path.slice(0, slash) : "",
    filename: slash >= 0 ? path.slice(slash + 1) : path,
  };
}

export async function adoptExistingBenchmarkOutput(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkRunRow,
): Promise<AiMediaBenchmarkRunRow | null> {
  if (row.output_bucket && row.output_path) return row;
  const expected = expectedOutputPath(row);
  if (!expected) return null;
  const { data, error } = await supabase.storage
    .from(expected.bucket)
    .list(expected.folder);
  if (error || !data?.some((item) => item.name === expected.filename)) {
    return null;
  }
  return completeOutputPointer(supabase, row, expected.bucket, expected.path);
}

export async function completeOutputPointer(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkRunRow,
  bucket: string,
  path: string,
): Promise<AiMediaBenchmarkRunRow> {
  const { data: updated, error } = await supabase
    .from("ai_media_benchmark_runs")
    .update({
      status: "succeeded",
      output_bucket: bucket,
      output_path: path,
      error_message: null,
      failure_code: null,
      completed_at: new Date().toISOString(),
      latency_ms: Date.now() - new Date(row.created_at).getTime(),
    })
    .eq("id", row.id)
    .is("output_path", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    const { data: current } = await supabase
      .from("ai_media_benchmark_runs")
      .select("*")
      .eq("id", row.id)
      .single();
    return current as AiMediaBenchmarkRunRow;
  }
  return updated as AiMediaBenchmarkRunRow;
}

export async function markDownloadFailed(
  supabase: SupabaseClient,
  id: string,
  errorMessage: string,
  failureCode: string,
): Promise<void> {
  await supabase
    .from("ai_media_benchmark_runs")
    .update({
      status: "download_failed",
      error_message: errorMessage.slice(0, 1000),
      failure_code: failureCode,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("output_path", null);
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof BenchmarkDownloadTimeoutError ||
    (err instanceof Error &&
      (err.name === "AbortError" || /aborted|timeout/i.test(err.message)))
  );
}

export async function downloadBenchmarkOutput(args: {
  row: AiMediaBenchmarkRunRow;
  url: string;
  fallbackType: string;
  filename: string;
  supabase: SupabaseClient;
  fetchImpl: typeof fetch;
  timeoutMs?: number;
  maxOutputBytes?: number;
  afterOutputUploaded?: () => Promise<void>;
}): Promise<AiMediaBenchmarkRunRow> {
  const {
    row,
    url,
    fallbackType,
    filename,
    supabase,
    fetchImpl,
  } = args;
  if (row.output_bucket && row.output_path) return row;

  const adopted = await adoptExistingBenchmarkOutput(supabase, row);
  if (adopted) return adopted;

  const timeoutMs = args.timeoutMs ?? AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS;
  const maxBytes = args.maxOutputBytes ?? AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response | undefined;
  let buffer: Buffer;
  try {
    try {
      response = await fetchImpl(url, {
        method: "GET",
        redirect: "error",
        signal: controller.signal,
      });
    } catch (err) {
      const code = isAbortError(err) ? "download_timeout" : "download_failed";
      await markDownloadFailed(
        supabase,
        row.id,
        err instanceof Error ? err.message : code,
        code,
      );
      throw new Error(code);
    }

    if (!response.ok) {
      await markDownloadFailed(
        supabase,
        row.id,
        `Download HTTP ${response.status}`,
        "download_http_failed",
      );
      throw new Error("download_http_failed");
    }

    const readPromise = readResponseBodyBounded(
      response,
      maxBytes,
      controller.signal,
    );
    const timeoutPromise = new Promise<never>((_, reject) => {
      const fail = () => {
        try {
          const cancelled = response?.body?.cancel();
          if (cancelled && typeof cancelled.catch === "function") {
            void cancelled.catch(() => undefined);
          }
        } catch {
          // Body may already be locked by the bounded reader.
        }
        reject(new BenchmarkDownloadTimeoutError(timeoutMs));
      };
      if (controller.signal.aborted) {
        fail();
        return;
      }
      controller.signal.addEventListener("abort", fail, { once: true });
    });
    try {
      buffer = await Promise.race([readPromise, timeoutPromise]);
    } catch (err) {
      void readPromise.catch(() => undefined);
      if (err instanceof BoundedDownloadError && err.code === "download_too_large") {
        await markDownloadFailed(supabase, row.id, err.message, "download_too_large");
        throw new Error("download_too_large");
      }
      const code = isAbortError(err) ? "download_timeout" : "download_failed";
      await markDownloadFailed(
        supabase,
        row.id,
        err instanceof Error ? err.message : code,
        code,
      );
      throw new Error(code);
    }

    if (controller.signal.aborted) {
      await markDownloadFailed(supabase, row.id, "download_timeout", "download_timeout");
      throw new Error("download_timeout");
    }
  } finally {
    clearTimeout(timer);
  }

  if (!response) {
    await markDownloadFailed(supabase, row.id, "download_failed", "download_failed");
    throw new Error("download_failed");
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || fallbackType;
  let stored: { bucket: string; path: string };
  try {
    stored = await storeBenchmarkOutput(supabase, row, buffer, contentType, filename);
  } catch (err) {
    await markDownloadFailed(
      supabase,
      row.id,
      err instanceof Error ? err.message : "upload_failed",
      "upload_failed",
    );
    throw new Error("upload_failed");
  }

  if (args.afterOutputUploaded) {
    try {
      await args.afterOutputUploaded();
    } catch (err) {
      await markDownloadFailed(
        supabase,
        row.id,
        err instanceof Error ? err.message : "finalize_interrupted",
        "finalize_interrupted",
      );
      throw err;
    }
  }

  return completeOutputPointer(supabase, row, stored.bucket, stored.path);
}

export async function storeBenchmarkOutput(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkRunRow,
  buffer: Buffer,
  contentType: string,
  filename: string,
): Promise<{ bucket: string; path: string }> {
  const projectId = row.project_id;
  if (!projectId) throw new Error("project_id_required");
  const bucket = STORAGE_BUCKETS.videoRenders;
  const path = buildAiMediaBenchmarkPath(projectId, row.id, filename);
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error("upload_failed");
  return { bucket, path };
}
