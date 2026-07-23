import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import {
  VIDEO_JOB_LEASE_SECONDS,
  VIDEO_JOB_LEGACY_STALE_MINUTES,
} from "@/lib/production-runtime/constants";

export type VideoJobClaimResult =
  | { status: "claimed"; leaseOwner: string; leaseExpiresAt: string | null }
  | { status: "busy"; jobStatus: string; leaseExpiresAt: string | null }
  | { status: "terminal"; jobStatus: string; output: Record<string, unknown> }
  | { status: "artifacts_ready"; output: Record<string, unknown> }
  | { status: "missing" };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function outputHasDurableMp4(output: unknown): boolean {
  const row = asRecord(output);
  return typeof row.mp4_url === "string" && row.mp4_url.length > 0;
}

export async function claimVideoJobForDispatch(
  supabase: SupabaseClient,
  args: {
    jobId: string;
    projectId: string;
    ownerToken: string;
    leaseSeconds?: number;
    legacyStaleMinutes?: number;
  },
): Promise<VideoJobClaimResult> {
  const { data, error } = await supabase.rpc("claim_video_job_for_dispatch", {
    p_job_id: args.jobId,
    p_project_id: args.projectId,
    p_owner_token: args.ownerToken,
    p_lease_seconds: args.leaseSeconds ?? VIDEO_JOB_LEASE_SECONDS,
    p_legacy_stale_minutes:
      args.legacyStaleMinutes ?? VIDEO_JOB_LEGACY_STALE_MINUTES,
  });
  if (error) throw error;
  const row = asRecord(data);
  const status = typeof row.status === "string" ? row.status : "";
  if (status === "claimed") {
    return {
      status: "claimed",
      leaseOwner: args.ownerToken,
      leaseExpiresAt:
        typeof row.lease_expires_at === "string" ? row.lease_expires_at : null,
    };
  }
  if (status === "busy") {
    return {
      status: "busy",
      jobStatus: typeof row.job_status === "string" ? row.job_status : "processing",
      leaseExpiresAt:
        typeof row.lease_expires_at === "string" ? row.lease_expires_at : null,
    };
  }
  if (status === "terminal") {
    return {
      status: "terminal",
      jobStatus: typeof row.job_status === "string" ? row.job_status : "failed",
      output: asRecord(row.output),
    };
  }
  if (status === "artifacts_ready") {
    return { status: "artifacts_ready", output: asRecord(row.output) };
  }
  if (status === "missing") return { status: "missing" };
  throw new Error(`claim_video_job_for_dispatch unexpected status: ${status}`);
}

export async function renewVideoJobLease(
  supabase: SupabaseClient,
  args: {
    jobId: string;
    projectId: string;
    ownerToken: string;
    leaseSeconds?: number;
  },
): Promise<boolean> {
  const { data, error } = await supabase.rpc("renew_video_job_lease", {
    p_job_id: args.jobId,
    p_project_id: args.projectId,
    p_owner_token: args.ownerToken,
    p_lease_seconds: args.leaseSeconds ?? VIDEO_JOB_LEASE_SECONDS,
  });
  if (error) throw error;
  return data === true;
}

export async function persistVideoJobArtifacts(
  supabase: SupabaseClient,
  args: {
    jobId: string;
    projectId: string;
    ownerToken: string;
    output: Record<string, unknown>;
  },
): Promise<boolean> {
  const { data, error } = await supabase.rpc("persist_video_job_artifacts", {
    p_job_id: args.jobId,
    p_project_id: args.projectId,
    p_owner_token: args.ownerToken,
    p_output: args.output as Json,
  });
  if (error) throw error;
  return data === true;
}

export async function promoteVideoJobIfArtifactsReady(
  supabase: SupabaseClient,
  args: { jobId: string; projectId: string },
): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    "promote_video_job_if_artifacts_ready",
    {
      p_job_id: args.jobId,
      p_project_id: args.projectId,
    },
  );
  if (error) throw error;
  return data === true;
}
