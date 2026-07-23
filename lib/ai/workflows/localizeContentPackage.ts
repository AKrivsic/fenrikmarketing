import type { LanguageCode, Project } from "@/lib/supabase/types";
import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  buildLocalizeContentPackagePrompt,
  LOCALIZE_PACKAGE_SYSTEM,
  type LocalizeSourcePlatformItem,
} from "@/lib/ai/prompts/localizeContentPackage";
import {
  localizeContentPackageSchema,
  type LocalizeContentPackageOutput,
} from "@/lib/ai/schemas/localizeContentPackage";
import { WorkflowError, type WorkflowResult } from "@/lib/ai/workflows/shared";

export interface LocalizeContentPackageInput {
  project: Project;
  targetLanguage: LanguageCode;
  // The approved primary-language content to localize. sourceLanguage is always
  // project.language and is derived here (never passed in).
  source: {
    voiceoverText: string;
    subtitles: string;
    cta?: { type: string; text: string } | null;
    platformItems: LocalizeSourcePlatformItem[];
  };
}

export interface LocalizedContentPackageData {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  localized: LocalizeContentPackageOutput;
}

// Optional dependency injection so tests can supply a fake provider and avoid
// network calls. Production callers omit it and get the Claude copywriting
// provider via the standard routing.
export interface LocalizeContentPackageDeps {
  textProvider?: TextProvider;
}

// Builds a guardrail that fails when the localized output drops or invents a
// platform relative to the source (platform outputs must be preserved 1:1).
function makePlatformPreservationGuardrail(
  sourcePlatforms: string[],
): (value: LocalizeContentPackageOutput) => ValidationIssue[] {
  const expected = new Set(sourcePlatforms);
  return (value) => {
    const issues: ValidationIssue[] = [];
    const got = new Set(value.platform_outputs.map((p) => p.platform));
    for (const platform of expected) {
      if (!got.has(platform)) {
        issues.push({
          path: "$.platform_outputs",
          message: `missing localized output for source platform "${platform}"`,
        });
      }
    }
    for (const platform of got) {
      if (!expected.has(platform)) {
        issues.push({
          path: "$.platform_outputs",
          message: `unexpected platform "${platform}" not present in the source`,
        });
      }
    }
    return issues;
  };
}

// Localizes an approved content package into a single target language. Pure with
// respect to the database: it takes already-loaded primary content and returns a
// validated, typed object. It does NOT persist content_items, does NOT start
// video jobs, and leaves the visual spec (render_spec) untouched — only text is
// localized. A future generateLanguageVariants action wires this to persistence.
export async function localizeContentPackageForLanguage(
  input: LocalizeContentPackageInput,
  deps: LocalizeContentPackageDeps = {},
): Promise<WorkflowResult<LocalizedContentPackageData>> {
  const { project, targetLanguage, source } = input;
  const sourceLanguage = project.language;

  if (!targetLanguage) {
    throw new WorkflowError("invalid_input", "target language is required");
  }
  if (targetLanguage === sourceLanguage) {
    throw new WorkflowError(
      "invalid_input",
      "target language must differ from the project's primary language",
    );
  }
  if (source.platformItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      "at least one source platform item is required",
    );
  }

  const textProvider = deps.textProvider ?? getCopywritingProvider();

  const generated = await generateValidatedJson({
    textProvider,
    system: LOCALIZE_PACKAGE_SYSTEM,
    prompt: buildLocalizeContentPackagePrompt({
      project,
      sourceLanguage,
      targetLanguage,
      source,
    }),
    validator: localizeContentPackageSchema,
    guardrails: makePlatformPreservationGuardrail(
      source.platformItems.map((item) => item.platform),
    ),
    telemetry: {
      stepName: "Language Localization",
      inputSummary: `Localize package → ${targetLanguage}`,
    },
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  return {
    ok: true,
    data: {
      sourceLanguage,
      targetLanguage,
      localized: generated.value,
    },
  };
}
