"use server";

import { redirect } from "next/navigation";
import {
  createProjectForAdmin,
  updateProjectForAdmin,
} from "@/lib/api/projects-admin";
import { runProjectKnowledgeExtraction } from "@/lib/ai/workflows/extractKnowledge";
import { emptyKnowledge } from "@/lib/knowledge/types";
import { LANGUAGE_OPTIONS } from "@/lib/projects/fieldOptions";
import type { Json, LanguageCode, ProjectInsert } from "@/lib/supabase/types";

export interface CreateProjectFormValues {
  name: string;
  websiteUrl: string;
  language: string;
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Onboarding defaults for the required Project Brain enum columns that the
// minimal create form does not collect. They can be refined later in the
// Project Brain editor; they only need to be valid enum values here.
const DEFAULT_TYPE = "local_service" as const;
const DEFAULT_MARKET_SCOPE = "local" as const;
const DEFAULT_GOAL_TYPE = "lead_generation" as const;
const DEFAULT_LANGUAGE: LanguageCode = "cs";

function inLanguageOptions(value: string): value is LanguageCode {
  return (LANGUAGE_OPTIONS as string[]).includes(value);
}

// Validates the URL shape without fetching: a bare host or full http(s) URL.
function isUsableUrl(raw: string): boolean {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

// Onboarding entry point: Create Project -> URL Extraction -> Knowledge
// Extraction -> (redirect to) Approve Cards. Persists via createProjectForAdmin
// (MVP admin has no user session; same service-role path as the project list).
// The URL + extraction step is best-effort: even on failure the user lands on
// the Approve Cards screen (with an empty proposal to fill in).
export async function createProjectOnboarding(
  values: CreateProjectFormValues,
): Promise<ActionResult> {
  const fieldErrors: Record<string, string> = {};

  const name = values.name.trim();
  if (name.length === 0) fieldErrors.name = "Název je povinný.";

  const websiteUrl = values.websiteUrl.trim();
  if (websiteUrl.length === 0) {
    fieldErrors.websiteUrl = "Website URL je povinná.";
  } else if (!isUsableUrl(websiteUrl)) {
    fieldErrors.websiteUrl = "Neplatná URL.";
  }

  const language = inLanguageOptions(values.language)
    ? values.language
    : DEFAULT_LANGUAGE;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Zkontroluj zvýrazněná pole.", fieldErrors };
  }

  const insert: ProjectInsert = {
    name,
    type: DEFAULT_TYPE,
    language,
    enabled_languages: [],
    market_scope: DEFAULT_MARKET_SCOPE,
    target_audience: {},
    goal_type: DEFAULT_GOAL_TYPE,
    product_is: [],
    product_is_not: [],
    product_strengths: [],
    pain_points: [],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: [],
    publishing_rules: {},
    default_cta: null,
  };

  let projectId: string;
  try {
    const project = await createProjectForAdmin(insert);
    projectId = project.id;
  } catch (err) {
    console.error("[createProjectOnboarding] create project failed:", err);
    return { ok: false, error: "Vytvoření projektu se nezdařilo." };
  }

  // Store the source URL (empty proposed cards) so the knowledge block exists,
  // then run extraction. Both steps are best-effort and must not block the
  // redirect to the Approve Cards screen.
  try {
    const base = emptyKnowledge("proposed", "url", websiteUrl);
    await updateProjectForAdmin(projectId, {
      knowledge: base as unknown as Json,
    });
    await runProjectKnowledgeExtraction(projectId);
  } catch {
    // Ignore: the user can edit the empty proposal on the next screen.
  }

  redirect(`/projects/${projectId}/knowledge`);
}
