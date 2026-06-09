import {
  getProjectVideoArtifactUrl,
  type VideoArtifactType,
} from "@/lib/api/project-content-admin";

// Streams a single video artifact (MP4 / SRT / thumbnail) for one of the
// project's video jobs as a forced download. The signed storage URL is read
// server-side (admin client, scoped by project_id + job id) and never exposed
// to the client; the file is proxied with a Content-Disposition: attachment
// header so the browser downloads it with a stable filename.
//
// This is a read-only visibility endpoint — it performs no mutations and starts
// no generation. It mirrors the project-scoped isolation guarantee of the rest
// of the data layer: a job id from another project resolves to null → 404.

const ARTIFACT_FILENAME: Record<VideoArtifactType, string> = {
  mp4: "video.mp4",
  srt: "subtitles.srt",
  thumbnail: "thumbnail",
};

const ARTIFACT_CONTENT_TYPE: Record<VideoArtifactType, string> = {
  mp4: "video/mp4",
  srt: "application/x-subrip",
  thumbnail: "application/octet-stream",
};

function isArtifactType(value: string | null): value is VideoArtifactType {
  return value === "mp4" || value === "srt" || value === "thumbnail";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const type = searchParams.get("type");

  if (!jobId || !isArtifactType(type)) {
    return new Response("Bad request", { status: 400 });
  }

  let url: string | null;
  try {
    url = await getProjectVideoArtifactUrl(projectId, jobId, type);
  } catch {
    return new Response("Failed to resolve artifact", { status: 500 });
  }

  if (!url) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return new Response("Artifact unavailable", { status: 502 });
  }

  // Prefer the upstream content-type for the thumbnail (extension varies);
  // use an explicit type for the well-known mp4/srt artifacts.
  const contentType =
    type === "thumbnail"
      ? (upstream.headers.get("content-type") ??
        ARTIFACT_CONTENT_TYPE.thumbnail)
      : ARTIFACT_CONTENT_TYPE[type];

  let filename = ARTIFACT_FILENAME[type];
  if (type === "thumbnail") {
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    filename = `thumbnail.${ext}`;
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
