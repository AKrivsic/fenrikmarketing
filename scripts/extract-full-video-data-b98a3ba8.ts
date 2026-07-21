/**
 * One-off extractor for run b98a3ba8 / package c8c17f53.
 * Usage: npx tsx scripts/extract-full-video-data-b98a3ba8.ts
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1).replace(/^"|"$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const JOB_ID = "e872b684-a6bc-40a3-aa4a-573bec78c959";
const PKG_ID = "c8c17f53-3257-4785-8676-0931dac13633";
const RUN_ID = "b98a3ba8-4e34-4027-82d4-c58a798f7201";
const OUT_DIR = resolve("reports/audit-b98a3ba8");
const RAW_DIR = resolve("scripts/output/b98a3ba8");

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status} ${dest}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return { dest, bytes: buf.length, ok: true as const };
}

async function main() {
  mkdirSync(OUT_DIR + "/scenes", { recursive: true });
  mkdirSync(RAW_DIR, { recursive: true });

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdminClient();

  const { data: job, error: jobErr } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("id", JOB_ID)
    .single();
  if (jobErr) throw jobErr;

  const { data: pkg, error: pkgErr } = await supabase
    .from("content_packages")
    .select("*")
    .eq("id", PKG_ID)
    .single();
  if (pkgErr) throw pkgErr;

  const { data: items } = await supabase
    .from("content_items")
    .select(
      "id, platform, format, status, title, body, caption, hashtags, cta, language, generation_metadata, created_at",
    )
    .eq("package_id", PKG_ID);

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, knowledge")
    .eq("id", pkg.project_id)
    .single();

  const { data: strategy } = await supabase
    .from("content_strategy_items")
    .select("*")
    .eq("id", pkg.strategy_item_id)
    .maybeSingle();

  const { data: run } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", RUN_ID)
    .single();

  const { data: runItem } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", RUN_ID)
    .eq("content_package_id", PKG_ID)
    .maybeSingle();

  writeFileSync(RAW_DIR + "/video-job.json", JSON.stringify(job, null, 2));
  writeFileSync(RAW_DIR + "/package.json", JSON.stringify(pkg, null, 2));
  writeFileSync(RAW_DIR + "/content-items.json", JSON.stringify(items, null, 2));
  writeFileSync(
    RAW_DIR + "/project-meta.json",
    JSON.stringify({ id: project?.id, name: project?.name }, null, 2),
  );
  writeFileSync(RAW_DIR + "/strategy-item.json", JSON.stringify(strategy, null, 2));
  writeFileSync(RAW_DIR + "/production-run.json", JSON.stringify(run, null, 2));
  writeFileSync(
    RAW_DIR + "/production-run-item.json",
    JSON.stringify(runItem, null, 2),
  );

  const out = job.output as Record<string, unknown>;
  const inp = job.input as Record<string, unknown>;
  const downloads: Array<Record<string, unknown>> = [];

  async function tryDl(
    label: string,
    url: string | null | undefined,
    dest: string,
  ) {
    if (!url) {
      downloads.push({ label, dest, exists: false, error: "NO_URL" });
      return;
    }
    try {
      const r = await download(url, dest);
      downloads.push({
        label,
        ...r,
        url_storage_path: url.split("?")[0],
      });
    } catch (e: unknown) {
      downloads.push({
        label,
        dest,
        exists: false,
        error: String(e instanceof Error ? e.message : e),
      });
    }
  }

  await tryDl("output.mp4", out.mp4_url as string, OUT_DIR + "/output.mp4");
  await tryDl(
    "subtitles.srt",
    out.subtitle_url as string,
    OUT_DIR + "/subtitles.srt",
  );
  await tryDl(
    "thumbnail.png",
    out.thumbnail_url as string,
    OUT_DIR + "/thumbnail.png",
  );

  const renderSpec = (out.render_spec ?? {}) as Record<string, unknown>;
  const scenes = Array.isArray(renderSpec.scenes) ? renderSpec.scenes : [];
  for (const raw of scenes) {
    const s = raw as Record<string, unknown>;
    if (!s.image_bucket || !s.image_path) continue;
    const { data: signed, error } = await supabase.storage
      .from(String(s.image_bucket))
      .createSignedUrl(String(s.image_path), 60 * 60 * 24 * 7);
    const fname =
      String(s.image_path).split("/").pop() || `${String(s.id)}.png`;
    if (error || !signed?.signedUrl) {
      downloads.push({
        label: fname,
        exists: false,
        error: error?.message || "sign failed",
        storage: `${s.image_bucket}/${s.image_path}`,
      });
      continue;
    }
    await tryDl(fname, signed.signedUrl, OUT_DIR + "/scenes/" + fname);
  }

  const projectId = String(project?.id ?? "");
  const voiceCandidates = [
    `${projectId}/video/${JOB_ID}/voice.wav`,
    `${projectId}/video/${JOB_ID}/voiceover.wav`,
    `${projectId}/video/${JOB_ID}/audio.wav`,
    `${projectId}/video/${JOB_ID}/tts.wav`,
    `${projectId}/video/${JOB_ID}/voice.mp3`,
    `${projectId}/video/${JOB_ID}/audio.mp3`,
  ];
  for (const path of voiceCandidates) {
    const { data: signed, error } = await supabase.storage
      .from("video-renders")
      .createSignedUrl(path, 60);
    if (!error && signed?.signedUrl) {
      await tryDl("voice-audio", signed.signedUrl, OUT_DIR + "/voice.wav");
      break;
    }
  }

  writeFileSync(RAW_DIR + "/downloads.json", JSON.stringify(downloads, null, 2));
  writeFileSync(RAW_DIR + "/render-spec.json", JSON.stringify(renderSpec, null, 2));
  writeFileSync(RAW_DIR + "/debug.json", JSON.stringify(out.debug, null, 2));
  writeFileSync(
    RAW_DIR + "/job-input.json",
    JSON.stringify(inp, null, 2),
  );

  const brief = (pkg.package_brief ?? {}) as Record<string, unknown>;
  writeFileSync(RAW_DIR + "/package-brief.json", JSON.stringify(brief, null, 2));
  writeFileSync(
    RAW_DIR + "/presentation-generation.json",
    JSON.stringify(
      brief.presentation_generation ?? inp.presentation_analyzer ?? null,
      null,
      2,
    ),
  );

  const debug = (out.debug ?? {}) as Record<string, unknown>;
  console.log(
    JSON.stringify(
      {
        job_id: JOB_ID,
        downloads: downloads.map((d) => ({
          label: d.label,
          exists: d.exists !== false && !d.error,
          bytes: d.bytes,
          error: d.error,
        })),
        scene_count: scenes.length,
        audio_duration: debug.audio_duration,
        video_duration: debug.video_duration,
        whisper_words: debug.whisper_word_count,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
