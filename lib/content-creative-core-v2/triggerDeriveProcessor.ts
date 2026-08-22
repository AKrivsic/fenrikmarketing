/**
 * Kick Creative Core v2 derive recovery.
 * Prefers durable content-package-worker when CONTENT_PACKAGE_WORKER_URL is set;
 * otherwise same-deployment Vercel endpoint (after() kick only).
 */

import { fetchWithRetry } from "@/lib/http/fetchWithRetry";
import { N8N_SECRET_HEADER } from "@/lib/n8n/callback";
import { getContentPackageWorkerUrl } from "@/lib/content-package-worker/client";

export async function triggerCreativeCoreV2DeriveProcessor(
  origin: string,
  payload?: { projectId?: string; packageId?: string },
): Promise<boolean> {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret) return false;

  const workerBase = getContentPackageWorkerUrl();
  const url = workerBase
    ? new URL("/recover-creative-core-v2-derive", workerBase).toString()
    : new URL("/api/ai/process-creative-core-v2-derive", origin).toString();

  try {
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [N8N_SECRET_HEADER]: secret,
        },
        body: JSON.stringify(payload ?? {}),
      },
      {
        timeoutMs: 15_000,
        maxAttempts: 1,
        label: "creative-core-v2-derive-kick",
      },
    );
    return response.ok || response.status === 202;
  } catch {
    if (workerBase) {
      try {
        const fallback = new URL(
          "/api/ai/process-creative-core-v2-derive",
          origin,
        ).toString();
        const response = await fetchWithRetry(
          fallback,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              [N8N_SECRET_HEADER]: secret,
            },
            body: JSON.stringify(payload ?? {}),
          },
          {
            timeoutMs: 15_000,
            maxAttempts: 1,
            label: "creative-core-v2-derive-kick-fallback",
          },
        );
        return response.ok || response.status === 202;
      } catch {
        return false;
      }
    }
    return false;
  }
}
