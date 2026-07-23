import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PACKAGE_GENERATION_LEASE_SECONDS } from "@/lib/production-runtime/constants";

export type PackageGenerationClaimResult =
  | { status: "existing_package"; packageId: string }
  | { status: "claimed"; ownerToken: string; leaseExpiresAt: string | null }
  | { status: "busy"; leaseExpiresAt: string | null; ownerToken: string | null };

export function newOwnerToken(): string {
  return randomUUID();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function claimPackageGeneration(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    strategyItemId: string;
    ownerToken: string;
    leaseSeconds?: number;
  },
): Promise<PackageGenerationClaimResult> {
  const { data, error } = await supabase.rpc("claim_package_generation", {
    p_project_id: args.projectId,
    p_strategy_item_id: args.strategyItemId,
    p_owner_token: args.ownerToken,
    p_lease_seconds: args.leaseSeconds ?? PACKAGE_GENERATION_LEASE_SECONDS,
  });
  if (error) throw error;
  const row = asRecord(data);
  const status = typeof row.status === "string" ? row.status : "";
  if (status === "existing_package") {
    const packageId =
      typeof row.package_id === "string" ? row.package_id : "";
    if (!packageId) {
      throw new Error("claim_package_generation returned existing_package without id");
    }
    return { status: "existing_package", packageId };
  }
  if (status === "busy") {
    return {
      status: "busy",
      leaseExpiresAt:
        typeof row.lease_expires_at === "string" ? row.lease_expires_at : null,
      ownerToken: typeof row.owner_token === "string" ? row.owner_token : null,
    };
  }
  if (status === "claimed") {
    return {
      status: "claimed",
      ownerToken: args.ownerToken,
      leaseExpiresAt:
        typeof row.lease_expires_at === "string" ? row.lease_expires_at : null,
    };
  }
  throw new Error(`claim_package_generation unexpected status: ${status}`);
}

export async function renewPackageGenerationClaim(
  supabase: SupabaseClient,
  args: {
    strategyItemId: string;
    ownerToken: string;
    leaseSeconds?: number;
  },
): Promise<boolean> {
  const { data, error } = await supabase.rpc("renew_package_generation_claim", {
    p_strategy_item_id: args.strategyItemId,
    p_owner_token: args.ownerToken,
    p_lease_seconds: args.leaseSeconds ?? PACKAGE_GENERATION_LEASE_SECONDS,
  });
  if (error) throw error;
  return data === true;
}

export async function releasePackageGenerationClaim(
  supabase: SupabaseClient,
  args: {
    strategyItemId: string;
    ownerToken: string;
    finalStatus?: "completed" | "failed" | "released";
  },
): Promise<boolean> {
  const { data, error } = await supabase.rpc("release_package_generation_claim", {
    p_strategy_item_id: args.strategyItemId,
    p_owner_token: args.ownerToken,
    p_final_status: args.finalStatus ?? "released",
  });
  if (error) throw error;
  return data === true;
}
