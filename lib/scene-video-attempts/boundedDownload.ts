import { SCENE_VIDEO_ATTEMPT_MAX_OUTPUT_BYTES } from "@/lib/scene-video-attempts/constants";

export class BoundedDownloadError extends Error {
  readonly code: "download_too_large" | "download_empty_body";

  constructor(code: BoundedDownloadError["code"], message: string) {
    super(message);
    this.name = "BoundedDownloadError";
    this.code = code;
  }
}

function abortError(): Error {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

/**
 * Reads a Response body with a hard byte cap.
 * Checks Content-Length when present; always counts streamed bytes and aborts
 * immediately past the limit (does not rely on missing Content-Length as safe).
 */
export async function readResponseBodyBounded(
  response: Response,
  maxBytes: number = SCENE_VIDEO_ATTEMPT_MAX_OUTPUT_BYTES,
  signal?: AbortSignal,
): Promise<Buffer> {
  if (signal?.aborted) throw abortError();

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader != null && contentLengthHeader !== "") {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      if (response.body) {
        try {
          await response.body.cancel();
        } catch {
          // ignore
        }
      }
      throw new BoundedDownloadError(
        "download_too_large",
        `Output Content-Length exceeds size limit (${declared} bytes)`,
      );
    }
  }

  if (!response.body || typeof response.body.getReader !== "function") {
    // Environments without a ReadableStream body (some test mocks).
    const buf = Buffer.from(await response.arrayBuffer());
    if (signal?.aborted) throw abortError();
    if (buf.byteLength > maxBytes) {
      throw new BoundedDownloadError(
        "download_too_large",
        `Output exceeds size limit (${buf.byteLength} bytes)`,
      );
    }
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (signal?.aborted) throw abortError();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        throw new BoundedDownloadError(
          "download_too_large",
          `Output exceeds size limit while streaming (${total} bytes)`,
        );
      }
      chunks.push(value);
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  if (total === 0 && chunks.length === 0) {
    // Empty body is allowed only if caller accepts it; treat as empty buffer.
    return Buffer.alloc(0);
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}
