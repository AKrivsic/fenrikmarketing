import { HttpTimeoutError } from "@/lib/http/fetchWithRetry";

export type VideoGenerationErrorCode =
  | "missing_api_key"
  | "invalid_input"
  | "http_error"
  | "timeout"
  | "task_failed"
  | "task_cancelled"
  | "unexpected_response";

export class VideoGenerationError extends Error {
  readonly code: VideoGenerationErrorCode;
  readonly httpStatus?: number;
  readonly providerTaskId?: string;
  readonly failureCode?: string;

  constructor(
    message: string,
    args: {
      code: VideoGenerationErrorCode;
      httpStatus?: number;
      providerTaskId?: string;
      failureCode?: string;
    },
  ) {
    super(message);
    this.name = "VideoGenerationError";
    this.code = args.code;
    this.httpStatus = args.httpStatus;
    this.providerTaskId = args.providerTaskId;
    this.failureCode = args.failureCode;
  }
}

const RUNWAY_KEY_PATTERN = /key_[0-9a-f]{8,}/gi;
const BEARER_PATTERN = /Bearer\s+\S+/gi;

export function redactSecret(text: string, apiKey?: string): string {
  let out = text;
  if (apiKey && apiKey.length > 0) {
    out = out.split(apiKey).join("[redacted]");
  }
  out = out.replace(RUNWAY_KEY_PATTERN, "[redacted]");
  out = out.replace(BEARER_PATTERN, "Bearer [redacted]");
  return out;
}

export function videoGenerationErrorFromUnknown(
  err: unknown,
  apiKey?: string,
  providerTaskId?: string,
): VideoGenerationError {
  if (err instanceof VideoGenerationError) {
    return err;
  }
  if (err instanceof HttpTimeoutError) {
    return new VideoGenerationError(
      redactSecret(
        `Runway request timed out after ${err.timeoutMs} ms`,
        apiKey,
      ),
      { code: "timeout", providerTaskId },
    );
  }
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "unknown error";
  return new VideoGenerationError(redactSecret(message, apiKey), {
    code: "http_error",
    providerTaskId,
  });
}
