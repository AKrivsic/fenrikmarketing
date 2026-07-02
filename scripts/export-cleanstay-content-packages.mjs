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

const PROJECT_ID = "b094cd3f-ca98-4900-ad0b-2579be7e2624";
const PROJECT_NAME = "Úklidy Praha Demo";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

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

function platformText(po) {
  if (!po) return "";
  return po.caption ?? po.text ?? "";
}

function platformHashtags(po) {
  if (!po || !Array.isArray(po.hashtags)) return [];
  return po.hashtags;
}

function youtubeFields(po, packageTitle) {
  if (!po) return { title: "", description: "", hashtags: [] };
  const cap = po.caption ?? "";
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

  lines.push(`## Package ${idx + 1} of ${pkgs.length}`);
  lines.push("");
  lines.push("### Meta");
  lines.push("");
  lines.push(`- **Package ID:** ${p.id}`);
  lines.push(`- **created_at:** ${p.created_at}`);
  lines.push(
    `- **generation_date:** ${generationDateForPackage(p.id) ?? ""}`,
  );
  lines.push(`- **updated_at:** ${p.updated_at}`);
  lines.push(`- **status:** ${p.status}`);
  lines.push("");
  lines.push("### Strategy");
  lines.push("");
  lines.push(`- **funnel_stage:** ${p.funnel_stage ?? ""}`);
  lines.push(`- **topic:** ${mdBlock(resolveTopic(strat))}`);
  lines.push(`- **angle:** ${mdBlock(resolveAngle(strat))}`);
  lines.push(`- **weekly_strategy_id:** ${p.weekly_strategy_id ?? ""}`);
  lines.push(`- **strategy_item_id:** ${p.strategy_item_id ?? ""}`);
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
  lines.push("#### video concept");
  lines.push("");
  lines.push(mdBlock(b.video?.concept));
  lines.push("");
  lines.push("#### video script");
  lines.push("");
  lines.push(mdBlock(b.video?.script));
  lines.push("");
  lines.push(`- **duration:** ${mdBlock(b.video?.duration_seconds ?? "")}`);
  lines.push("");
  lines.push("### Image prompts");
  lines.push("");
  const ips = b.image_prompts || [];
  if (ips.length === 0) {
    lines.push("");
  } else {
    lines.push(mdList(ips));
    lines.push("");
  }
  lines.push("### Assets");
  lines.push("");
  lines.push("#### asset usage");
  lines.push("");
  lines.push(jsonFence(b.asset_usage ?? []));
  lines.push("");
  lines.push("### Scenario");
  lines.push("");
  lines.push(mdBlock(b.scenario ?? ""));
  lines.push("");
  lines.push("### CTA");
  lines.push("");
  lines.push(`- **type:** ${mdBlock(b.cta?.type ?? "")}`);
  lines.push(`- **text:** ${mdBlock(b.cta?.text ?? "")}`);
  lines.push("");
  lines.push("### Platform outputs");
  lines.push("");
  lines.push("#### TikTok");
  lines.push("");
  lines.push("**caption**");
  lines.push("");
  lines.push(mdBlock(platformText(po.tiktok)));
  lines.push("");
  lines.push("**hashtags**");
  lines.push("");
  lines.push(mdList(platformHashtags(po.tiktok)));
  lines.push("");
  lines.push("#### Instagram");
  lines.push("");
  lines.push("**caption**");
  lines.push("");
  lines.push(mdBlock(platformText(po.instagram)));
  lines.push("");
  lines.push("**hashtags**");
  lines.push("");
  lines.push(mdList(platformHashtags(po.instagram)));
  lines.push("");
  lines.push("#### Facebook");
  lines.push("");
  lines.push("**text**");
  lines.push("");
  lines.push(mdBlock(platformText(po.facebook)));
  lines.push("");
  lines.push("#### LinkedIn");
  lines.push("");
  lines.push("**text**");
  lines.push("");
  lines.push(mdBlock(platformText(po.linkedin)));
  lines.push("");
  lines.push("#### X");
  lines.push("");
  lines.push("**text**");
  lines.push("");
  lines.push(mdBlock(platformText(po.x)));
  lines.push("");
  lines.push("#### Google Business");
  lines.push("");
  lines.push("**text**");
  lines.push("");
  lines.push(mdBlock(platformText(po.google_business)));
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
  lines.push("### Package brief (raw JSON)");
  lines.push("");
  lines.push(jsonFence(b));
  lines.push("");
  lines.push("---");
  lines.push("");
}

const outPath = resolve(
  process.cwd(),
  "scripts/output/cleanstay-content-packages-export.md",
);
const body = lines.join("\n");
writeFileSync(outPath, body, "utf8");
console.log("written", outPath, "packages", pkgs.length, "bytes", Buffer.byteLength(body));
