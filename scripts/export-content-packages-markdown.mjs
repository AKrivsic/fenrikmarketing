/**
 * Export all content_packages for a project to markdown.
 * Usage: node scripts/export-content-packages-markdown.mjs <project_id> <output_path> [project_display_name]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const projectId = process.argv[2];
const outputPath = process.argv[3];
const projectNameArg = process.argv[4];

if (!projectId || !outputPath) {
  console.error(
    "Usage: node scripts/export-content-packages-markdown.mjs <project_id> <output_path> [project_name]",
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: projectRow } = await supabase
  .from("projects")
  .select("id, name")
  .eq("id", projectId)
  .maybeSingle();

const PROJECT_ID = projectId;
const PROJECT_NAME = projectNameArg || projectRow?.name || projectId;

const { data: pkgs, error } = await supabase
  .from("content_packages")
  .select(
    "id, title, status, funnel_stage, strategy_item_id, weekly_strategy_id, package_brief, created_at, updated_at",
  )
  .eq("project_id", PROJECT_ID)
  .order("created_at", { ascending: true });
if (error) throw error;

const strategyIds = [
  ...new Set(pkgs.map((p) => p.strategy_item_id).filter(Boolean)),
];
let stratItems = [];
if (strategyIds.length) {
  const { data, error: e2 } = await supabase
    .from("content_strategy_items")
    .select(
      "id, strategy_id, platform, format, funnel_stage, brief, topic_id, created_at",
    )
    .in("id", strategyIds);
  if (e2) throw e2;
  stratItems = data || [];
}

const topicIds = [
  ...new Set(stratItems.map((s) => s.topic_id).filter(Boolean)),
];
let topics = [];
if (topicIds.length) {
  const { data } = await supabase
    .from("evergreen_topics")
    .select("id, title")
    .in("id", topicIds);
  topics = data || [];
}
const topicById = new Map(topics.map((t) => [t.id, t.title]));
const stratById = new Map(stratItems.map((s) => [s.id, s]));

const pkgIds = pkgs.map((p) => p.id);
const { data: contentItems } = await supabase
  .from("content_items")
  .select("id, package_id, platform, created_at, generation_metadata")
  .eq("project_id", PROJECT_ID)
  .in("package_id", pkgIds);

const itemsByPkg = new Map();
for (const ci of contentItems || []) {
  if (!ci.package_id) continue;
  const list = itemsByPkg.get(ci.package_id) || [];
  list.push(ci);
  itemsByPkg.set(ci.package_id, list);
}

function mdBlock(text) {
  if (text === null || text === undefined || text === "") return "";
  return String(text);
}

function mdList(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "";
  return arr.map((h, i) => `${i + 1}. ${h}`).join("\n");
}

function jsonFence(value) {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function generationDateForPackage(pkgId) {
  const items = itemsByPkg.get(pkgId) || [];
  if (items.length === 0) return null;
  let minCreated = null;
  let regen = null;
  for (const it of items) {
    if (!minCreated || it.created_at < minCreated) minCreated = it.created_at;
    const ra = it.generation_metadata?.regenerated_at;
    if (typeof ra === "string" && (!regen || ra > regen)) regen = ra;
  }
  return regen || minCreated;
}

function resolveTopic(strat) {
  if (!strat) return null;
  const brief =
    strat.brief && typeof strat.brief === "object" ? strat.brief : {};
  return (
    brief.topic ??
    (strat.topic_id ? topicById.get(strat.topic_id) : null) ??
    null
  );
}

function resolveAngle(strat) {
  if (!strat) return null;
  const brief =
    strat.brief && typeof strat.brief === "object" ? strat.brief : {};
  return brief.angle ?? null;
}

function platformPost(po) {
  if (!po) return "";
  return po.caption ?? po.text ?? po.post ?? "";
}

function platformHashtags(po) {
  if (!po || !Array.isArray(po.hashtags)) return [];
  return po.hashtags;
}

function youtubeFields(po, packageTitle) {
  if (!po) return { title: "", description: "", hashtags: [] };
  const cap = po.caption ?? po.description ?? "";
  let title = po.title ?? packageTitle ?? "";
  if (!po.title && cap.includes("|")) {
    title = cap.split("|")[0].trim();
  }
  return {
    title: title || packageTitle || "",
    description: cap,
    hashtags: platformHashtags(po),
  };
}

function imageInstructions(brief) {
  if (!brief || typeof brief !== "object") return null;
  if (brief.image_instructions !== undefined) return brief.image_instructions;
  if (brief.imageInstructions !== undefined) return brief.imageInstructions;
  return null;
}

const lines = [];
lines.push("# Content packages export");
lines.push("");
lines.push(`- **Project:** ${PROJECT_NAME}`);
lines.push(`- **Project ID:** ${PROJECT_ID}`);
lines.push(`- **Exported at:** ${new Date().toISOString()}`);
lines.push(`- **Package count:** ${pkgs.length}`);
lines.push("");
lines.push("---");
lines.push("");

for (let idx = 0; idx < pkgs.length; idx++) {
  const p = pkgs[idx];
  const b = p.package_brief || {};
  const strat = p.strategy_item_id ? stratById.get(p.strategy_item_id) : null;
  const po = b.platform_outputs || {};
  const yt = youtubeFields(po.youtube, p.title);
  const imgInstr = imageInstructions(b);

  lines.push(`## Package ${idx + 1} of ${pkgs.length}`);
  lines.push("");
  lines.push("### Metadata");
  lines.push("");
  lines.push(`- **package_id:** ${p.id}`);
  lines.push(`- **created_at:** ${p.created_at}`);
  lines.push(
    `- **generation_date:** ${generationDateForPackage(p.id) ?? ""}`,
  );
  lines.push(`- **status:** ${p.status}`);
  lines.push("");
  lines.push("### Strategy");
  lines.push("");
  lines.push(`- **funnel_stage:** ${p.funnel_stage ?? ""}`);
  lines.push(`- **strategy_item:** ${p.strategy_item_id ?? ""}`);
  if (strat) {
    lines.push(`- **strategy_item_platform:** ${strat.platform ?? ""}`);
    lines.push(`- **strategy_item_format:** ${strat.format ?? ""}`);
  }
  lines.push(`- **topic:** ${mdBlock(resolveTopic(strat))}`);
  lines.push(`- **angle:** ${mdBlock(resolveAngle(strat))}`);
  lines.push(`- **weekly_strategy_id:** ${p.weekly_strategy_id ?? ""}`);
  lines.push("");
  lines.push("#### strategy brief");
  lines.push("");
  lines.push(jsonFence(strat?.brief ?? null));
  lines.push("");
  lines.push("### Video");
  lines.push("");
  lines.push(`- **title:** ${mdBlock(p.title)}`);
  lines.push("");
  lines.push("#### hook");
  lines.push("");
  lines.push(mdBlock(b.hook));
  lines.push("");
  lines.push("#### voiceover_text");
  lines.push("");
  lines.push(mdBlock(b.voiceover_text));
  lines.push("");
  lines.push("#### subtitles");
  lines.push("");
  lines.push(mdBlock(b.subtitles));
  lines.push("");
  lines.push("#### video_script");
  lines.push("");
  lines.push(mdBlock(b.video?.script));
  lines.push("");
  lines.push("#### video_concept");
  lines.push("");
  lines.push(mdBlock(b.video?.concept));
  lines.push("");
  lines.push(`- **duration_seconds:** ${mdBlock(b.video?.duration_seconds ?? "")}`);
  if (b.scenario !== undefined && b.scenario !== null && b.scenario !== "") {
    lines.push("");
    lines.push("#### scenario");
    lines.push("");
    lines.push(mdBlock(b.scenario));
  }
  lines.push("");
  lines.push("### Platform Outputs");
  lines.push("");
  lines.push("#### TikTok");
  lines.push("");
  lines.push("**caption**");
  lines.push("");
  lines.push(mdBlock(platformPost(po.tiktok)));
  lines.push("");
  lines.push("**hashtags**");
  lines.push("");
  lines.push(mdList(platformHashtags(po.tiktok)));
  lines.push("");
  lines.push("#### Instagram");
  lines.push("");
  lines.push("**caption**");
  lines.push("");
  lines.push(mdBlock(platformPost(po.instagram)));
  lines.push("");
  lines.push("**hashtags**");
  lines.push("");
  lines.push(mdList(platformHashtags(po.instagram)));
  lines.push("");
  lines.push("#### Facebook");
  lines.push("");
  lines.push("**post**");
  lines.push("");
  lines.push(mdBlock(platformPost(po.facebook)));
  lines.push("");
  lines.push("#### LinkedIn");
  lines.push("");
  lines.push("**post**");
  lines.push("");
  lines.push(mdBlock(platformPost(po.linkedin)));
  lines.push("");
  lines.push("#### X");
  lines.push("");
  lines.push("**post**");
  lines.push("");
  lines.push(mdBlock(platformPost(po.x)));
  lines.push("");
  lines.push("#### Google Business");
  lines.push("");
  lines.push("**post**");
  lines.push("");
  lines.push(mdBlock(platformPost(po.google_business)));
  lines.push("");
  lines.push("#### YouTube");
  lines.push("");
  lines.push(`- **title:** ${mdBlock(yt.title)}`);
  lines.push("");
  lines.push("**description**");
  lines.push("");
  lines.push(mdBlock(yt.description));
  lines.push("");
  lines.push("**hashtags**");
  lines.push("");
  lines.push(mdList(yt.hashtags));
  lines.push("");
  lines.push("### Images");
  lines.push("");
  lines.push("#### image prompts");
  lines.push("");
  const ips = b.image_prompts || [];
  if (ips.length === 0) {
    lines.push("");
  } else {
    lines.push(mdList(ips));
    lines.push("");
  }
  lines.push("#### image instructions");
  lines.push("");
  if (imgInstr === null || imgInstr === undefined) {
    lines.push("");
  } else if (typeof imgInstr === "string") {
    lines.push(mdBlock(imgInstr));
    lines.push("");
  } else {
    lines.push(jsonFence(imgInstr));
    lines.push("");
  }
  lines.push("#### asset usage");
  lines.push("");
  lines.push(jsonFence(b.asset_usage ?? []));
  lines.push("");
  lines.push("### CTA");
  lines.push("");
  lines.push(`- **CTA type:** ${mdBlock(b.cta?.type ?? "")}`);
  lines.push(`- **CTA text:** ${mdBlock(b.cta?.text ?? "")}`);
  lines.push("");
  lines.push("### Package Brief");
  lines.push("");
  lines.push(jsonFence(b));
  lines.push("");
  lines.push("### Raw JSON");
  lines.push("");
  lines.push(
    jsonFence({
      id: p.id,
      project_id: PROJECT_ID,
      title: p.title,
      status: p.status,
      funnel_stage: p.funnel_stage,
      strategy_item_id: p.strategy_item_id,
      weekly_strategy_id: p.weekly_strategy_id,
      package_brief: b,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }),
  );
  lines.push("");
  lines.push("---");
  lines.push("");
}

const outPath = resolve(process.cwd(), outputPath);
const body = lines.join("\n");
writeFileSync(outPath, body, "utf8");
console.log(
  JSON.stringify({
    project: PROJECT_NAME,
    project_id: PROJECT_ID,
    packages: pkgs.length,
    path: outPath,
    bytes: Buffer.byteLength(body),
  }),
);
