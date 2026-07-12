/** Structured failure from an image provider HTTP response (OpenAI gpt-image). */
export class ImageProviderHttpError extends Error {
  readonly httpStatus: number;
  readonly errorCode?: string;
  readonly errorType?: string;
  readonly moderationStage?: string;
  readonly moderationCategories?: string[];

  constructor(
    message: string,
    args: {
      httpStatus: number;
      errorCode?: string;
      errorType?: string;
      moderationStage?: string;
      moderationCategories?: string[];
    },
  ) {
    super(message);
    this.name = "ImageProviderHttpError";
    this.httpStatus = args.httpStatus;
    this.errorCode = args.errorCode;
    this.errorType = args.errorType;
    this.moderationStage = args.moderationStage;
    this.moderationCategories = args.moderationCategories;
  }

  static fromOpenAIResponse(httpStatus: number, bodyText: string): ImageProviderHttpError {
    let errorCode: string | undefined;
    let errorType: string | undefined;
    let moderationStage: string | undefined;
    let moderationCategories: string[] | undefined;
    let message = `OpenAI image request failed (${httpStatus})`;

    try {
      const parsed = JSON.parse(bodyText) as {
        error?: {
          message?: string;
          code?: string;
          type?: string;
          moderation_details?: {
            moderation_stage?: string;
            categories?: string[];
          };
        };
      };
      const err = parsed.error;
      if (err?.message) {
        message = `OpenAI image request failed (${httpStatus}): ${err.message}`;
      }
      errorCode = typeof err?.code === "string" ? err.code : undefined;
      errorType = typeof err?.type === "string" ? err.type : undefined;
      moderationStage =
        typeof err?.moderation_details?.moderation_stage === "string"
          ? err.moderation_details.moderation_stage
          : undefined;
      if (Array.isArray(err?.moderation_details?.categories)) {
        moderationCategories = err.moderation_details.categories.filter(
          (c): c is string => typeof c === "string",
        );
      }
    } catch {
      if (bodyText.trim()) {
        message = `OpenAI image request failed (${httpStatus}): ${bodyText.slice(0, 200)}`;
      }
    }

    return new ImageProviderHttpError(message, {
      httpStatus,
      errorCode,
      errorType,
      moderationStage,
      moderationCategories,
    });
  }
}

export function isImageModerationBlocked(err: unknown): boolean {
  if (err instanceof ImageProviderHttpError) {
    if (err.errorCode === "moderation_blocked") return true;
    if (
      err.errorType === "image_generation_user_error" &&
      (err.errorCode === "moderation_blocked" ||
        (err.message.includes("safety system") &&
          !isNonRetryableImageProviderError(err)))
    ) {
      return true;
    }
    return false;
  }
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  if (!msg.includes("OpenAI image request failed")) return false;
  return (
    msg.includes('"code": "moderation_blocked"') ||
    msg.includes('"code":"moderation_blocked"') ||
    (msg.includes("image_generation_user_error") &&
      msg.includes("safety system"))
  );
}

/** Auth, quota, and transport failures must not be masked by scene fallback. */
export function isNonRetryableImageProviderError(err: unknown): boolean {
  if (!(err instanceof ImageProviderHttpError)) return false;
  if (err.httpStatus === 401 || err.httpStatus === 403) return true;
  if (err.httpStatus === 429) return true;
  if (err.httpStatus >= 500) return true;
  const code = err.errorCode ?? "";
  if (
    code === "insufficient_quota" ||
    code === "billing_hard_limit_reached" ||
    code === "rate_limit_exceeded"
  ) {
    return true;
  }
  return false;
}
