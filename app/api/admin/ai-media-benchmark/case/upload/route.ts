/**
 * POST /api/admin/ai-media-benchmark/case/upload
 * Upload a benchmark test image to the video-renders bucket.
 * Returns: { bucket, path, sha256, imageUuid } for use in createBenchmarkCase.
 *
 * Immutability guarantees:
 *   - Rejected if a case for (projectId, caseId) already exists in DB.
 *   - Storage path includes a random UUID, never reused.
 *   - upsert: false — will error if path already exists (should not happen with UUID).
 *   - SHA-256 of the file is computed and returned; included in fingerprint.
 *
 * Accepts multipart/form-data: projectId, file (image).
 * Max file size: 20 MB. Accepted types: image/jpeg, image/png, image/webp.
 */
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS, buildBenchmarkCaseImagePath } from "@/lib/api/storage";
import { DEFAULT_VIDEO_CASE_ID } from "@/lib/ai-media-benchmark/types";
import { loadBenchmarkCase } from "@/lib/ai-media-benchmark/benchmarkCase";

export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extension(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

async function sha256hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return NextResponse.json({ error: "project_id_required" }, { status: 400 });

  const caseId = DEFAULT_VIDEO_CASE_ID;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported_image_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Reject upload if the case already exists — no replacing the locked image.
  const existing = await loadBenchmarkCase(supabase, projectId, caseId);
  if (existing) {
    return NextResponse.json(
      { error: "benchmark_case_already_exists", caseId },
      { status: 409 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const sha256 = await sha256hex(arrayBuffer);

  const imageUuid = crypto.randomUUID();
  const ext = extension(file.type);
  const filename = `source.${ext}`;
  const path = buildBenchmarkCaseImagePath(projectId, caseId, imageUuid, filename);
  const bucket = STORAGE_BUCKETS.videoRenders;

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: "upload_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ bucket, path, sha256, imageUuid });
}
