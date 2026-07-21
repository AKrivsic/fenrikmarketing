import {
  checklistScenePayloadSchema,
  type ChecklistScenePayload,
} from "@/lib/scene-types/checklist/checklistScenePayload";
import {
  phoneScenePayloadSchema,
  type PhoneScenePayload,
} from "@/lib/scene-types/phone/phoneScenePayload";
import {
  quoteScenePayloadSchema,
  type QuoteScenePayload,
} from "@/lib/scene-types/quote/quoteScenePayload";
import {
  statisticScenePayloadSchema,
  type StatisticScenePayload,
} from "@/lib/scene-types/statistic/statisticScenePayload";
import {
  ctaScenePayloadSchema,
  type CtaScenePayload,
} from "@/lib/scene-types/cta/ctaScenePayload";
import {
  normalizeSceneType,
  type SceneType,
} from "@/lib/scene-types/sceneType";
import type {
  VisualSceneAi,
  VisualSceneAsset,
  VisualScenePlanItem,
} from "@/lib/content-package/visualScenePlan";
import {
  vEnum,
  vNonEmptyString,
  vObject,
  vOptional,
  vString,
  type ValidationIssue,
  type Validator,
} from "@/lib/ai/validateAiOutput";

/** CHECKLIST scene stored in package visual_scenes (generation output). */
export interface VisualSceneChecklistStored {
  type: "CHECKLIST";
  payload: ChecklistScenePayload;
  id?: string;
}

/** PHONE scene stored in package visual_scenes (generation output). */
export interface VisualScenePhoneStored {
  type: "PHONE";
  payload: PhoneScenePayload;
  id?: string;
}

/** QUOTE scene stored in package visual_scenes (generation output). */
export interface VisualSceneQuoteStored {
  type: "QUOTE";
  payload: QuoteScenePayload;
  id?: string;
}

/** STATISTIC scene stored in package visual_scenes (generation output). */
export interface VisualSceneStatisticStored {
  type: "STATISTIC";
  payload: StatisticScenePayload;
  id?: string;
}

/** CTA scene stored in package visual_scenes (generation output). */
export interface VisualSceneCtaStored {
  type: "CTA";
  payload: CtaScenePayload;
  id?: string;
}

export type PackageVisualSceneEntry =
  | VisualScenePlanItem
  | VisualSceneChecklistStored
  | VisualScenePhoneStored
  | VisualSceneQuoteStored
  | VisualSceneStatisticStored
  | VisualSceneCtaStored;

const GENERATION_SCENE_TYPES = [
  "IMAGE",
  "CHECKLIST",
  "PHONE",
  "QUOTE",
  "STATISTIC",
  "CTA",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function isChecklistVisualSceneEntry(
  entry: PackageVisualSceneEntry,
): entry is VisualSceneChecklistStored {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    (entry as VisualSceneChecklistStored).type === "CHECKLIST"
  );
}

export function isPhoneVisualSceneEntry(
  entry: PackageVisualSceneEntry,
): entry is VisualScenePhoneStored {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    (entry as VisualScenePhoneStored).type === "PHONE"
  );
}

export function isQuoteVisualSceneEntry(
  entry: PackageVisualSceneEntry,
): entry is VisualSceneQuoteStored {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    (entry as VisualSceneQuoteStored).type === "QUOTE"
  );
}

export function isStatisticVisualSceneEntry(
  entry: PackageVisualSceneEntry,
): entry is VisualSceneStatisticStored {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    (entry as VisualSceneStatisticStored).type === "STATISTIC"
  );
}

export function isCtaVisualSceneEntry(
  entry: PackageVisualSceneEntry,
): entry is VisualSceneCtaStored {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    (entry as VisualSceneCtaStored).type === "CTA"
  );
}

export function isTypedNonImageVisualSceneEntry(
  entry: PackageVisualSceneEntry,
): entry is
  | VisualSceneChecklistStored
  | VisualScenePhoneStored
  | VisualSceneQuoteStored
  | VisualSceneStatisticStored
  | VisualSceneCtaStored {
  return (
    isChecklistVisualSceneEntry(entry) ||
    isPhoneVisualSceneEntry(entry) ||
    isQuoteVisualSceneEntry(entry) ||
    isStatisticVisualSceneEntry(entry) ||
    isCtaVisualSceneEntry(entry)
  );
}

function validateLegacyImageEntry(
  value: unknown,
  path: string,
): ValidationIssue[] {
  const record = asRecord(value);
  if (!record) return [{ path, message: "expected visual scene object" }];
  const source = record.source;
  if (source === "ai") {
    const prompt =
      typeof record.image_prompt === "string" ? record.image_prompt.trim() : "";
    if (!prompt) {
      return [{ path: `${path}.image_prompt`, message: "required for ai scene" }];
    }
    return [];
  }
  if (source === "asset") {
    const asset_id =
      typeof record.asset_id === "string" ? record.asset_id.trim() : "";
    const used_as =
      typeof record.used_as === "string" ? record.used_as.trim() : "";
    if (!asset_id) {
      return [{ path: `${path}.asset_id`, message: "required for asset scene" }];
    }
    if (!used_as) {
      return [{ path: `${path}.used_as`, message: "required for asset scene" }];
    }
    return [];
  }
  return [{ path: `${path}.source`, message: 'expected "ai" or "asset"' }];
}

function validateChecklistEntry(
  value: unknown,
  path: string,
): ValidationIssue[] {
  const record = asRecord(value);
  if (!record) return [{ path, message: "expected checklist scene object" }];
  const parsed = checklistScenePayloadSchema.safeParse(record.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return [
      {
        path: `${path}.payload${issue?.path?.length ? `.${issue.path.join(".")}` : ""}`,
        message: issue?.message ?? "invalid checklist payload",
      },
    ];
  }
  return [];
}

function validatePhoneEntry(
  value: unknown,
  path: string,
): ValidationIssue[] {
  const record = asRecord(value);
  if (!record) return [{ path, message: "expected phone scene object" }];
  const parsed = phoneScenePayloadSchema.safeParse(record.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return [
      {
        path: `${path}.payload${issue?.path?.length ? `.${issue.path.join(".")}` : ""}`,
        message: issue?.message ?? "invalid phone payload",
      },
    ];
  }
  return [];
}

function validateQuoteEntry(
  value: unknown,
  path: string,
): ValidationIssue[] {
  const record = asRecord(value);
  if (!record) return [{ path, message: "expected quote scene object" }];
  const parsed = quoteScenePayloadSchema.safeParse(record.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return [
      {
        path: `${path}.payload${issue?.path?.length ? `.${issue.path.join(".")}` : ""}`,
        message: issue?.message ?? "invalid quote payload",
      },
    ];
  }
  return [];
}

function validateStatisticEntry(
  value: unknown,
  path: string,
): ValidationIssue[] {
  const record = asRecord(value);
  if (!record) return [{ path, message: "expected statistic scene object" }];
  const parsed = statisticScenePayloadSchema.safeParse(record.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return [
      {
        path: `${path}.payload${issue?.path?.length ? `.${issue.path.join(".")}` : ""}`,
        message: issue?.message ?? "invalid statistic payload",
      },
    ];
  }
  return [];
}

function validateCtaEntry(
  value: unknown,
  path: string,
): ValidationIssue[] {
  const record = asRecord(value);
  if (!record) return [{ path, message: "expected cta scene object" }];
  const parsed = ctaScenePayloadSchema.safeParse(record.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return [
      {
        path: `${path}.payload${issue?.path?.length ? `.${issue.path.join(".")}` : ""}`,
        message: issue?.message ?? "invalid cta payload",
      },
    ];
  }
  return [];
}

/** Validates one visual_scenes entry for content-package generation. */
export function generatedVisualSceneEntryValidator(
  value: unknown,
  path = "$",
): ValidationIssue[] {
  const record = asRecord(value);
  if (!record) return [{ path, message: "expected visual scene object" }];

  if (
    typeof record.type === "string" &&
    record.type.trim().toUpperCase() === "PRODUCT_DEMO"
  ) {
    return [
      {
        path: `${path}.type`,
        message: "PRODUCT_DEMO is no longer supported — use PPD-authorized presentation",
      },
    ];
  }

  const explicitType = normalizeSceneType(record.type);

  if (explicitType && !GENERATION_SCENE_TYPES.includes(explicitType as (typeof GENERATION_SCENE_TYPES)[number])) {
    return [
      {
        path: `${path}.type`,
        message: `scene type ${explicitType} is not allowed in generation output`,
      },
    ];
  }

  if (explicitType === "CHECKLIST") {
    return validateChecklistEntry(value, path);
  }

  if (explicitType === "PHONE") {
    return validatePhoneEntry(value, path);
  }

  if (explicitType === "QUOTE") {
    return validateQuoteEntry(value, path);
  }

  if (explicitType === "STATISTIC") {
    return validateStatisticEntry(value, path);
  }

  if (explicitType === "CTA") {
    return validateCtaEntry(value, path);
  }

  if (explicitType === "IMAGE") {
    return validateLegacyImageEntry(record.payload ?? record, `${path}.payload`);
  }

  if (record.source === "ai" || record.source === "asset") {
    return validateLegacyImageEntry(value, path);
  }

  if (explicitType === null && record.payload) {
    return validateLegacyImageEntry(record.payload, `${path}.payload`);
  }

  return [{ path, message: "unrecognized visual scene entry" }];
}

export const generatedVisualScenesArrayValidator = (
  opts: { min?: number; max?: number } = {},
): Validator<PackageVisualSceneEntry[]> => {
  const { min = 1, max = 5 } = opts;
  return (value, path = "$") => {
    if (!Array.isArray(value)) {
      return [{ path, message: "expected array" }];
    }
    if (value.length < min) {
      return [{ path, message: `expected at least ${min} visual scene(s)` }];
    }
    if (value.length > max) {
      return [
        {
          path,
          message: `visual_scenes exceeds max ${max} scenes for one video`,
        },
      ];
    }
    return value.flatMap((entry, i) =>
      generatedVisualSceneEntryValidator(entry, `${path}[${i}]`),
    );
  };
};

export function normalizeUnsupportedGenerationSceneType(
  entry: unknown,
): PackageVisualSceneEntry | null {
  const record = asRecord(entry);
  if (!record) return null;
  const t = normalizeSceneType(record.type);
  if (t && t !== "IMAGE" && t !== "CHECKLIST" && t !== "PHONE" && t !== "QUOTE" && t !== "STATISTIC" && t !== "CTA") {
    return null;
  }
  return entry as PackageVisualSceneEntry;
}
