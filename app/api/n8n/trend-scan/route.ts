import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CallbackValidationError,
  unauthorizedResponse,
  validationErrorResponse,
  verifyN8nSecret,
} from "@/lib/n8n/callback";
import { handleTrendScanCallback } from "@/lib/n8n/handlers";
import { loadProjectOrThrow, WorkflowError } from "@/lib/ai/workflows/shared";
import { scoreTrendRelevance } from "@/lib/ai/workflows/scoreTrend";
import { MIN_TREND_RELEVANCE } from "@/lib/ai/schemas/trendRelevanceScore";
import { errorResponse, readJsonBody, requireString } from "@/lib/ai/apiResponse";

// n8n-invoked execution endpoint for the Trend Scan workflow.
//
// n8n supplies discovered candidates (it owns the external sources — no scraping
// is added here). This endpoint scores each candidate with the EXISTING AI
// scoring (scoreTrendRelevance: same prompt, provider routing and schema as
// runScoreTrend) using the service-role admin client, then persists ONLY the
// accepted trends via the EXISTING handleTrendScanCallback (writes only to
// `trends`, relevance_score in metadata). Rejected trends are never stored —
// they are returned in the response only.
//
// Multi-project: project_id comes from the payload, nothing is hardcoded.
export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");

    const rawCandidates = body["candidates"];
    if (!Array.isArray(rawCandidates)) {
      throw new WorkflowError("invalid_input", "candidates must be an array");
    }
    const candidates = rawCandidates.map(parseCandidate);

    const supabase = createSupabaseAdminClient();
    // Project Brain is the scoring context (also validates existence -> 404).
    const project = await loadProjectOrThrow(supabase, projectId);

    const acceptedTrends: Record<string, unknown>[] = [];
    const rejectedTrends: Record<string, unknown>[] = [];

    for (const candidate of candidates) {
      const scored = await scoreTrendRelevance({
        project,
        title: candidate.title,
        source: candidate.source,
      });

      if (!scored.ok) {
        rejectedTrends.push({
          title: candidate.title,
          source: candidate.source,
          reason: "scoring_failed",
        });
        continue;
      }

      const score = scored.value;
      if (score.relevance_score < MIN_TREND_RELEVANCE) {
        rejectedTrends.push({
          title: candidate.title,
          source: candidate.source,
          relevance_score: score.relevance_score,
          reason: "below_threshold",
        });
        continue;
      }

      acceptedTrends.push({
        title: candidate.title,
        source: candidate.source,
        relevance_score: score.relevance_score,
        rationale: score.rationale,
        angle: score.recommended_angle ?? null,
        ...(candidate.url ? { source_url: candidate.url } : {}),
      });
    }

    // Persist accepted via the existing mechanism (writes only to `trends`).
    // rejected_trends are passed empty: the handler never stores them anyway.
    await handleTrendScanCallback({
      project_id: projectId,
      accepted_trends: acceptedTrends,
      rejected_trends: [],
    });

    return Response.json(
      {
        ok: true,
        workflow: "trend_scan",
        accepted: acceptedTrends.length,
        rejected: rejectedTrends.length,
        rejected_trends: rejectedTrends,
      },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof CallbackValidationError) {
      return validationErrorResponse(err.message);
    }
    return errorResponse(err);
  }
}

interface ParsedCandidate {
  source: string;
  title: string;
  summary?: string;
  url?: string;
}

function parseCandidate(raw: unknown): ParsedCandidate {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new WorkflowError("invalid_input", "each candidate must be an object");
  }
  const candidate = raw as Record<string, unknown>;
  return {
    source: requireString(candidate, "source"),
    title: requireString(candidate, "title"),
    summary:
      typeof candidate["summary"] === "string"
        ? (candidate["summary"] as string)
        : undefined,
    url:
      typeof candidate["url"] === "string"
        ? (candidate["url"] as string)
        : undefined,
  };
}
