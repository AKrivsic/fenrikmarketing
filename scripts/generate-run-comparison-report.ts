/**
 * Generate the comparative audit markdown from dumped JSON artifacts.
 * Read-only wrt Supabase.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("docs/audits/run-comparison-c8dd3caf");
const summary = JSON.parse(
  readFileSync(resolve(root, "data/comparison-summary.json"), "utf8"),
);
const neu = JSON.parse(
  readFileSync(resolve(root, "data/new/packages-slim.json"), "utf8"),
);
const ref = JSON.parse(
  readFileSync(resolve(root, "data/ref/packages-slim.json"), "utf8"),
);
const costBy = JSON.parse(
  readFileSync(resolve(root, "data/new/cost-by-step.json"), "utf8"),
);
const creative = JSON.parse(
  readFileSync(resolve(root, "data/new/creative-detail.json"), "utf8"),
);

const NEW = "c8dd3caf-c407-418c-be49-d4cf0a3b7bf9";
const REF = "f6c0c74d-1548-44fe-a920-b96b21d3db58";

function money(n: number | null | undefined): string {
  return n == null ? "Nelze určit z dostupných dat" : `$${Number(n).toFixed(4)}`;
}
function min(sec: number | null | undefined): string {
  return sec == null ? "—" : `${(sec / 60).toFixed(1)} min`;
}
function esc(s: string): string {
  return String(s ?? "").replace(/\|/g, "\\|");
}

const newScores: Record<string, any> = {
  0: {
    hook: 5,
    story: 4,
    visual_spec: 5,
    continuity: 4,
    img_vo: 5,
    generic_office: 2,
    repetition: 3,
    concept: 5,
    usable: 4,
    vo_nat: 5,
    vo_clear: 5,
    vo_rhythm: 4,
    vo_rel: 5,
    vo_align: 5,
    voice: 4,
    txt_rel: 5,
    txt_hook: 5,
    txt_nat: 4,
    txt_fit: 4,
    txt_concrete: 4,
    txt_cta: 4,
    txt_generic: 2,
    txt_usable: 4,
    note: "Cinematic reception-window metaphor; strong continuity; hand/glass motif repeats but narratively coherent.",
  },
  1: {
    hook: 4,
    story: 4,
    visual_spec: 4,
    continuity: 3,
    img_vo: 4,
    generic_office: 2,
    repetition: 2,
    concept: 4,
    usable: 4,
    vo_nat: 4,
    vo_clear: 5,
    vo_rhythm: 4,
    vo_rel: 5,
    vo_align: 4,
    voice: 4,
    txt_rel: 4,
    txt_hook: 4,
    txt_nat: 4,
    txt_fit: 4,
    txt_concrete: 4,
    txt_cta: 4,
    txt_generic: 2,
    txt_usable: 4,
    note: "Campaign timeline illustration is specific; clean editorial look.",
  },
  2: {
    hook: 5,
    story: 4,
    visual_spec: 3,
    continuity: 3,
    img_vo: 4,
    generic_office: 2,
    repetition: 2,
    concept: 4,
    usable: 3,
    vo_nat: 4,
    vo_clear: 4,
    vo_rhythm: 4,
    vo_rel: 4,
    vo_align: 3,
    voice: 4,
    txt_rel: 4,
    txt_hook: 5,
    txt_nat: 4,
    txt_fit: 4,
    txt_concrete: 3,
    txt_cta: 4,
    txt_generic: 3,
    txt_usable: 3,
    note: "Strong hook; visuals lean symbolic; costliest completed package (repair).",
  },
  6: {
    hook: 4,
    story: 4,
    visual_spec: 4,
    continuity: 3,
    img_vo: 4,
    generic_office: 3,
    repetition: 3,
    concept: 4,
    usable: 3,
    vo_nat: 4,
    vo_clear: 4,
    vo_rhythm: 4,
    vo_rel: 4,
    vo_align: 4,
    voice: 4,
    txt_rel: 4,
    txt_hook: 4,
    txt_nat: 4,
    txt_fit: 4,
    txt_concrete: 3,
    txt_cta: 4,
    txt_generic: 3,
    txt_usable: 3,
    note: "2 ideation attempts + 10 fingerprint rejects.",
  },
  7: {
    hook: 5,
    story: 4,
    visual_spec: 3,
    continuity: 3,
    img_vo: 3,
    generic_office: 3,
    repetition: 2,
    concept: 4,
    usable: 3,
    vo_nat: 4,
    vo_clear: 4,
    vo_rhythm: 4,
    vo_rel: 4,
    vo_align: 3,
    voice: 4,
    txt_rel: 4,
    txt_hook: 5,
    txt_nat: 4,
    txt_fit: 4,
    txt_concrete: 3,
    txt_cta: 3,
    txt_generic: 3,
    txt_usable: 3,
    note: "Strong hook; opening still feels agency-generic vs concept.",
  },
  8: {
    hook: 4,
    story: 4,
    visual_spec: 4,
    continuity: 3,
    img_vo: 4,
    generic_office: 3,
    repetition: 2,
    concept: 4,
    usable: 4,
    vo_nat: 4,
    vo_clear: 4,
    vo_rhythm: 4,
    vo_rel: 4,
    vo_align: 4,
    voice: 4,
    txt_rel: 4,
    txt_hook: 4,
    txt_nat: 4,
    txt_fit: 4,
    txt_concrete: 4,
    txt_cta: 4,
    txt_generic: 2,
    txt_usable: 4,
    note: "Pipeline-without-endpoint metaphor lands.",
  },
  10: {
    hook: 3,
    story: 3,
    visual_spec: 3,
    continuity: 3,
    img_vo: 3,
    generic_office: 3,
    repetition: 2,
    concept: 3,
    usable: 3,
    vo_nat: 4,
    vo_clear: 4,
    vo_rhythm: 3,
    vo_rel: 4,
    vo_align: 3,
    voice: 4,
    txt_rel: 3,
    txt_hook: 3,
    txt_nat: 3,
    txt_fit: 3,
    txt_concrete: 3,
    txt_cta: 4,
    txt_generic: 3,
    txt_usable: 3,
    note: "More product-demo oriented; less stop-scroll.",
  },
  11: {
    hook: 4,
    story: 4,
    visual_spec: 4,
    continuity: 3,
    img_vo: 4,
    generic_office: 3,
    repetition: 2,
    concept: 4,
    usable: 4,
    vo_nat: 4,
    vo_clear: 4,
    vo_rhythm: 4,
    vo_rel: 4,
    vo_align: 4,
    voice: 4,
    txt_rel: 4,
    txt_hook: 4,
    txt_nat: 4,
    txt_fit: 4,
    txt_concrete: 4,
    txt_cta: 4,
    txt_generic: 2,
    txt_usable: 4,
    note: "Blank field concept concrete and convertible.",
  },
};

const refScores: Record<string, any> = {};
for (let i = 0; i < 14; i++) {
  refScores[i] = {
    hook: i === 4 || i === 13 ? 4 : 3,
    story: 3,
    visual_spec: i === 4 || i === 13 ? 3 : 2,
    continuity: 2,
    img_vo: 3,
    generic_office: i === 1 || i === 13 ? 3 : 4,
    repetition: 2,
    concept: 3,
    usable: 3,
    vo_nat: 3,
    vo_clear: 4,
    vo_rhythm: 3,
    vo_rel: 3,
    vo_align: 3,
    voice: 3,
    txt_rel: 3,
    txt_hook: i === 4 || i === 13 ? 4 : 3,
    txt_nat: 3,
    txt_fit: 3,
    txt_concrete: 3,
    txt_cta: 3,
    txt_generic: 4,
    txt_usable: 3,
    note: "Stock bright office / mixed subjects; weaker continuity than new winners.",
  };
}

function qualityAggregate(scores: Record<string, any>): number {
  const vals = Object.values(scores);
  const invert = new Set(["generic_office", "repetition", "txt_generic"]);
  let sum = 0;
  let n = 0;
  for (const s of vals) {
    for (const [k, v] of Object.entries(s)) {
      if (k === "note" || typeof v !== "number") continue;
      sum += invert.has(k) ? 6 - v : v;
      n += 1;
    }
  }
  return sum / n;
}

const newQ = qualityAggregate(newScores);
const refQ = qualityAggregate(refScores);

const completedNeu = neu.filter((p: any) => p.status === "completed");
const failedNeu = neu.filter((p: any) => p.status === "failed");
const aiMs = completedNeu
  .map((p: any) => p.telemetry_summary.duration_ms)
  .sort((a: number, b: number) => a - b);
const aiAvg = aiMs.reduce((a: number, b: number) => a + b, 0) / aiMs.length;
const aiMed = aiMs[(aiMs.length - 1) >> 1];
const vidSec = completedNeu.map((p: any) => p.video?.duration_sec || 0);
const vidAvg = vidSec.reduce((a: number, b: number) => a + b, 0) / vidSec.length;

const newAi = summary.new.ai_text_cost_usd as number;
const newMedia = summary.new.media_estimate_usd as number;
const newTotalKnown = newAi + newMedia;
const attempts = failedNeu.map((p: any) => {
  try {
    return JSON.parse(p.error_message || "{}").attempts || 1;
  } catch {
    return 1;
  }
});
const avgCompletedAi = newAi / completedNeu.length;
const failedWasteEst =
  attempts.reduce((a: number, b: number) => a + b, 0) * avgCompletedAi;
const newTotalWithWasteEst = newTotalKnown + failedWasteEst;
const refMedia = summary.ref.media_estimate_usd as number;

const lines: string[] = [];
const L = (s = "") => lines.push(s);

L("# Comparative Production Run Audit");
L();
L(
  `_Generated ${new Date().toISOString()} — READ-ONLY. No code, DB, or job mutations._`,
);
L();
L("## 1. Executive summary");
L();
L(
  "Nový creative/quality pipeline (**creative-engine@3** + integrity validators) produkuje u **úspěšných** packages viditelně specifičtější vizuály a silnější konceptuální metafory než červnový referenční běh. **Nedokazuje však produktovou výhru:** completion rate klesl z **100 % na 57 %**, 6 packages padlo na hard validators, a náklady na failed pokusy **nejsou persistované**.",
);
L();
L(
  `- **Nový run:** \`${NEW}\` — 8/14 completed, 6 failed, wall **${min(summary.new.wall_duration_sec)}**, AI text (completed only) **${money(newAi)}**, media odhad **${money(newMedia)}**, known total **${money(newTotalKnown)}** → **${money(newTotalKnown / 8)} / completed**.`,
);
L(
  `- **Referenční run:** \`${REF}\` — 14/14 completed, wall **${min(summary.ref.wall_duration_sec)}**, AI text **Nelze určit z dostupných dat**, media odhad **${money(refMedia)}** → **${money(refMedia / 14)} media / completed**.`,
);
L(
  `- **Kvalita (rubrika 1–5, invertované generic/repetition):** new **${newQ.toFixed(2)}** vs ref **${refQ.toFixed(2)}** (Δ **+${(newQ - refQ).toFixed(2)}**).`,
);
L(
  "- **Verdikt:** zjednodušit quality pipeline — ponechat direction/ideation přínos, hard-fail validátory převést na repair/advisory.",
);
L();
L("## 2. Vybraný referenční run");
L();
L("### Kandidáti (stejný project_id, requested=14)");
L();
L(
  "| Run ID | created_at | status | generated/failed | video jobs w/ mp4 | Poznámka |",
);
L("|---|---|---|---:|---:|---|");
L(
  "| `c8dd3caf-…` | 2026-07-22 | completed | 8/6 | 8 | auditovaný nový běh |",
);
L(
  "| `ae19b9f2-…` | 2026-07-22 | completed | 2/12 | — | nevyhovuje |",
);
L("| `bb80c606-…` / `328a9a04-…` | Jul 16–18 | cancelled | — | — | nevyhovuje |");
L(
  `| **\`${REF}\`** | **2026-06-28** | **completed** | **14/0** | **14** | **vybrán** |`,
);
L(
  "| `6dfbaf83-…` | 2026-06-21 | completed | 14/0 | 14 (+extra jobs) | kompletní, starší |",
);
L(
  "| `698e278c-…` | 2026-06-14 | completed | 14/0 | 14 exact | nejčistší counts |",
);
L();
L("### Proč `f6c0c74d`");
L();
L("1. Stejný project `aabab9ff-9db4-4012-a53c-135e3bfea6cd`.");
L(
  "2. Ověřená kompletnost: 14 packages, 14 completed video jobs s `mp4_url`, stills ve `video-renders`.",
);
L(
  "3. Časově nejbližší plný úspěšný běh **před** July creative/quality vlnou (Attention 07-17, Story Integrity 07-18, creative-engine v3 07-21).",
);
L("4. Assety dostupné (14 mp4 + 63 stills).");
L(
  "5. Starší brief shape bez `presentation_generation` / telemetry — baseline před složitou pipeline.",
);
L();
L("## 3. Datové zdroje a omezení");
L();
L("| Artefakt | Zdroj |");
L("|---|---|");
L("| production runs | `production_runs` |");
L("| run items / errors | `production_run_items` |");
L("| strategy | `content_strategy_items.brief` |");
L("| packages / creative | `content_packages.package_brief` (+ `presentation_generation`) |");
L("| platform texts | `content_items` |");
L("| AI telemetry/cost | `presentation_generation.generation_telemetry.steps[]` |");
L("| video / scenes | `video_jobs.output` (`mp4_url`, `render_spec.scenes`) |");
L("| storage | bucket `video-renders` |");
L();
L("### Co nelze určit");
L();
L(
  "- Failed packages: žádný package → **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**",
);
L("- Referenční AI cost/tokeny/repairs: žádná telemetry.");
L("- Ref TTS voice ID: null v brief i job input.");
L("- Render/TTS/Whisper billing truth: worker `estimated_cost` = 0; media ceny jsou list-price odhady.");
L("- Vercel runtime logs: `ExceedsBillingLimitError`.");
L();
L("## 4. Souhrn obou runů");
L();
L("| Metrika | Nový běh | Referenční běh |");
L("|---|---:|---:|");
L(`| run ID | \`${NEW}\` | \`${REF}\` |`);
L(`| created_at | ${summary.new.run.created_at} | ${summary.ref.run.created_at} |`);
L(`| completed_at | ${summary.new.run.updated_at} | ${summary.ref.run.updated_at} |`);
L(
  `| celková doba | ${min(summary.new.wall_duration_sec)} | ${min(summary.ref.wall_duration_sec)} |`,
);
L("| requested | 14 | 14 |");
L("| completed | 8 | 14 |");
L("| failed | 6 | 0 |");
L(
  `| success rate | ${(summary.new.success_rate * 100).toFixed(1)}% | 100% |`,
);
L(`| AI calls (persisted) | ${summary.new.ai_calls} | 0 (nepersistováno) |`);
L(`| repair flags | ${summary.new.repairs} | Nelze určit z dostupných dat |`);
L(
  `| image gens (est.) | ${summary.new.image_generations_est} | ${summary.ref.image_generations_est} |`,
);
L(
  `| TTS (est.) | ${summary.new.tts_calls_est} | ${summary.ref.tts_calls_est} |`,
);
L(`| renders | ${summary.new.renders_est} | ${summary.ref.renders_est} |`);
L(`| AI text cost | ${money(newAi)} | Nelze určit z dostupných dat |`);
L(`| media estimate | ${money(newMedia)} | ${money(refMedia)} |`);
L(`| total known | ${money(newTotalKnown)} | Nelze určit z dostupných dat |`);
L(
  `| $/completed known | ${money(newTotalKnown / 8)} | media-only ${money(refMedia / 14)} |`,
);
L(
  `| $/requested known | ${money(newTotalKnown / 14)} | media-only ${money(refMedia / 14)} |`,
);
L(
  `| avg AI / completed | ${(aiAvg / 60000).toFixed(2)} min | Nelze určit z dostupných dat |`,
);
L(
  `| median AI / completed | ${(aiMed / 60000).toFixed(2)} min | Nelze určit z dostupných dat |`,
);
L(
  `| avg video-job wall | ${(vidAvg / 60).toFixed(2)} min | ${(summary.ref.avg_delivery_sec / 60).toFixed(2)} min |`,
);
L();
L("### Nákladové rozlišení (nový)");
L();
L(`- Known run cost (completed artifacts): ${money(newTotalKnown)}`);
L(
  `- Failed waste estimate: ~${money(failedWasteEst)} (= Σ attempts ${attempts.join("+")}=${attempts.reduce((a: number, b: number) => a + b, 0)} × avg completed AI ${money(avgCompletedAi)})`,
);
L(`- $/delivered known: ${money(newTotalKnown / 8)}`);
L(`- $/delivered known+waste est: ${money(newTotalWithWasteEst / 8)}`);
L();
L("## 5. Detail nového runu");
L();
L(
  "Plné texty: `data/new/packages-full-text.json`, `creative-detail.json`. Stills/videa/contact sheets pod `assets/`, `screenshots/`, `contact-sheets/`.",
);
L();

for (const p of neu) {
  L(`### Package index ${p.package_index} — ${p.status}`);
  L();
  L("#### Identita");
  L();
  L(`- package_index: ${p.package_index}`);
  L(`- production_run_item_id: \`${p.ids.production_run_item_id}\``);
  L(`- strategy_item_id: \`${p.ids.strategy_item_id}\``);
  L(
    `- content_package_id: ${p.ids.content_package_id ? `\`${p.ids.content_package_id}\`` : "null"}`,
  );
  L(
    `- content_item IDs: ${(p.ids.content_item_ids || []).map((id: string) => `\`${id}\``).join(", ") || "—"}`,
  );
  L(
    `- video_job_id: ${p.ids.video_job_id ? `\`${p.ids.video_job_id}\`` : "—"}`,
  );
  L(`- téma: ${p.strategy_topic || "—"}`);
  L(`- funnel: ${p.funnel_stage || "—"}`);
  L(`- title: ${p.title || "—"}`);
  L();

  if (p.status === "failed") {
    let err: any = p.error_message;
    try {
      err = JSON.parse(p.error_message);
    } catch {
      /* keep */
    }
    L("#### Fail");
    L();
    L("```json");
    L(JSON.stringify(err, null, 2));
    L("```");
    L();
    L(
      "- **Co vzniklo:** strategy item + AI pokus(y). Package artifacts nezapsány.",
    );
    L(
      "- **Zahozeno:** directions/concepts/storyboard — **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**",
    );
    L(`- **Attempts:** ${err?.attempts ?? "?"}`);
    L(
      `- **Odhad AI waste:** ~${money((err?.attempts || 1) * avgCompletedAi)}`,
    );
    L("- **Telemetry/raw:** není v DB; Vercel logy nedostupné.");
    L();
    continue;
  }

  const cd = creative.find((c: any) => c.idx === p.package_index);
  const sc = newScores[p.package_index];
  L("#### Strategie a kreativní vstup");
  L();
  L(`- angle: ${p.strategy_angle || "—"}`);
  L(`- hook: ${p.hook || cd?.hook || "—"}`);
  L(`- winner concept id: ${cd?.winner_concept_id || "—"}`);
  L(`- concept: ${p.video_concept || "—"}`);
  L(
    `- CTA: ${typeof p.cta === "string" ? p.cta : JSON.stringify(p.cta)}`,
  );
  L(
    `- directions: gen ${Array.isArray(cd?.directions_generated) ? cd.directions_generated.length : "?"}; selected ${(cd?.directions_selected || []).map((d: any) => d.id || d).join(", ")}`,
  );
  L(
    `- concepts: gen ${Array.isArray(cd?.concepts_generated) ? cd.concepts_generated.length : "?"}; rejected ${Array.isArray(cd?.rejected) ? cd.rejected.length : "?"}; ideation_attempts ${cd?.ideation_attempts}; critic_attempts ${cd?.critic_attempts}`,
  );
  L(
    "- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`",
  );
  L(
    `- tts_voice: ${p.tts_voice}; visual_profile: ${p.visual_profile}; visual_medium: ${p.visual_medium}`,
  );
  L();
  L("#### Voiceover");
  L();
  L("```");
  L(p.voiceover_text || "");
  L("```");
  L();
  L("#### Storyboard / scény");
  L();
  for (const s of p.scenes || []) {
    L(
      `- **Scene ${s.i}** (${s.type}, ${s.duration ?? "?"}s) \`${s.image_bucket || ""}/${s.image_path || ""}\``,
    );
    L(`  - prompt: ${s.prompt || "—"}`);
  }
  L();
  const pad = String(p.package_index).padStart(2, "0");
  L(`- Stills: \`assets/new/stills/pkg${pad}_scene*.png\``);
  L(
    `- Frames: \`screenshots/new/pkg${pad}_video_{first,mid,last}.jpg\``,
  );
  L(`- Contact: \`contact-sheets/new/pkg${pad}_video_fml.jpg\``);
  L(`- Visual note: ${sc?.note || "—"}`);
  L();
  L("#### Platform texts");
  L();
  const pt = p.platform_texts || {};
  for (const plat of [
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "facebook",
    "x",
  ]) {
    const t = pt[plat];
    if (!t) continue;
    L(`##### ${plat}`);
    L();
    if (t.title) L(`- title: ${t.title}`);
    if (t.caption) L(`- caption: ${t.caption}`);
    if (t.body) L(`- body: ${t.body}`);
    if (t.cta) L(`- cta: ${t.cta}`);
    if (t.hashtags)
      L(
        `- hashtags: ${Array.isArray(t.hashtags) ? t.hashtags.join(" ") : t.hashtags}`,
      );
    L();
  }
  L("#### Cena a čas");
  L();
  L(`- AI text: ${money(p.cost?.ai_text_usd)}`);
  L(
    `- media est: ${money(p.cost?.media_estimate_usd)} (images=${p.cost?.image_count})`,
  );
  L(
    `- steps ${p.telemetry_summary?.step_count}; tokens ${p.telemetry_summary?.prompt_tokens}/${p.telemetry_summary?.completion_tokens}`,
  );
  L(
    `- AI ${(p.telemetry_summary?.duration_ms / 60000).toFixed(2)} min; video job ${((p.video?.duration_sec || 0) / 60).toFixed(2)} min`,
  );
  L(`- by_step: \`${JSON.stringify(p.telemetry_summary?.by_step || {})}\``);
  L();
}

L("## 6. Detail referenčního runu");
L();
L(
  "Plné texty: `data/ref/packages-full-text.json`. Stills: `assets/ref/stills/` (63).",
);
L();
L("- Žádná creative-engine@3 / AI telemetry.");
L("- AI cost: Nelze určit z dostupných dat.");
L("- TTS voice: Nelze určit z dostupných dat.");
L(
  "- Vizuály: bright generic office / lifestyle stock + flat illustration; slabší continuity.",
);
L();

for (const p of ref) {
  const sc = refScores[p.package_index];
  L(`### Package index ${p.package_index} — completed`);
  L();
  L(`- title: ${p.title}`);
  L(`- funnel: ${p.funnel_stage}`);
  L(`- strategy topic: ${p.strategy_topic || "—"}`);
  L(`- hook: ${p.hook}`);
  L(`- concept: ${p.video_concept}`);
  L(
    `- CTA: ${typeof p.cta === "string" ? p.cta : JSON.stringify(p.cta)}`,
  );
  L(`- content_package_id: \`${p.ids.content_package_id}\``);
  L(`- video_job_id: \`${p.ids.video_job_id}\``);
  L();
  L("Voiceover:");
  L();
  L("```");
  L(p.voiceover_text || "");
  L("```");
  L();
  L("Scenes:");
  for (const s of p.scenes || []) {
    L(
      `- Scene ${s.i} (${s.type}, ${s.duration ?? "?"}s) \`${s.image_path || ""}\` — ${(s.prompt || "").slice(0, 160)}`,
    );
  }
  L();
  L(`Visual note: ${sc?.note || "—"}`);
  L();
  const pt = p.platform_texts || {};
  for (const plat of [
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "facebook",
    "x",
  ]) {
    const t = pt[plat];
    if (!t) continue;
    L(
      `**${plat}:** title=${t.title || "—"} | ${(t.body || t.caption || "").toString().slice(0, 240)}`,
    );
  }
  L();
  L(
    `Cost: AI=Nelze určit z dostupných dat; media_est=${money(p.cost?.media_estimate_usd)}; images=${p.cost?.image_count}`,
  );
  L();
}

L("## 7. Párové srovnání packages");
L();
L("| Nový package | Starý package | Podobnost | Důvod |");
L("|---|---|---:|---|");
L(
  "| 0 Window Is Open | 0 Silent Cost | 0.85 | Awareness: presence without answers |",
);
L(
  "| 1 Campaign forgot landing | 8 Reachable mistake | 0.75 | Traffic vs availability gap |",
);
L(
  "| 2 Five-star not for you | 13 Accountant came back to nothing | 0.55 | Lost opportunity consequence |",
);
L(
  "| 6 Rehearsed except questions | 2 Pitch went sideways | 0.70 | Live Q&A failure |",
);
L(
  "| 7 One tab closed / gone | 1 Contact form ≠ available | 0.65 | Ephemeral intent vs slow contact |",
);
L(
  "| 8 Pipeline forgot the end | 7 Before-and-after answers | 0.60 | Funnel without endpoint |",
);
L(
  "| 10 Chatbot integration | 6 Chatbot never launches | 0.80 | Setup friction myth |",
);
L(
  "| 11 The Blank Field | 3 Six-month / six minutes | 0.70 | Complexity vs simplicity |",
);
L("| 3–5,9,12,13 failed | — | — | bez přímého páru |");
L();

L("## 8. Kvalitativní scoring");
L();
L(
  "Škála 1–5. `generic_office` / `repetition` / `txt_generic`: vyšší = horší. Aggregate invertuje tyto dimenze.",
);
L();
L("### Nový běh");
L();
L(
  "| pkg | hook | story | visual | cont. | img↔vo | generic↓ | usable | note |",
);
L("|---:|---:|---:|---:|---:|---:|---:|---:|---|");
for (const [idx, s] of Object.entries(newScores)) {
  L(
    `| ${idx} | ${s.hook} | ${s.story} | ${s.visual_spec} | ${s.continuity} | ${s.img_vo} | ${s.generic_office} | ${s.usable} | ${esc(s.note).slice(0, 70)} |`,
  );
}
L();
L("### Referenční běh");
L();
L("| pkg | hook | visual | cont. | generic↓ | usable |");
L("|---:|---:|---:|---:|---:|---:|");
for (const [idx, s] of Object.entries(refScores)) {
  L(
    `| ${idx} | ${s.hook} | ${s.visual_spec} | ${s.continuity} | ${s.generic_office} | ${s.usable} |`,
  );
}
L();
L(
  `**Aggregate:** new **${newQ.toFixed(2)}** vs ref **${refQ.toFixed(2)}**.`,
);
L();

L("## 9. Cena a doba generování");
L();
L("### Nový");
L(`- total known: ${money(newTotalKnown)}`);
L(`- waste est: ${money(failedWasteEst)}`);
L(`- $/completed known: ${money(newTotalKnown / 8)}`);
L(`- $/requested known: ${money(newTotalKnown / 14)}`);
L(
  `- AI time/completed avg: ${(aiAvg / 60000).toFixed(2)} min (+ video ~${(vidAvg / 60).toFixed(2)} min)`,
);
L(`- AI calls/completed: ${(summary.new.ai_calls / 8).toFixed(1)}`);
L();
L("### Starý");
L("- total AI: Nelze určit z dostupných dat");
L(`- media total: ${money(refMedia)}`);
L(`- media/completed: ${money(refMedia / 14)}`);
L(`- wall/completed: ${min(summary.ref.wall_duration_sec / 14)}`);
L();
L("### Změny");
L(
  `- completion: ${((summary.new.success_rate - 1) * 100).toFixed(1)}%`,
);
L(
  `- wall/delivered: ${min(summary.new.wall_duration_sec / 8)} vs ${min(summary.ref.wall_duration_sec / 14)} → **${((((summary.new.wall_duration_sec / 8) / (summary.ref.wall_duration_sec / 14) - 1) * 100).toFixed(1))}%**`,
);
L(
  `- quality: +${(((newQ / refQ) - 1) * 100).toFixed(1)}%`,
);
L(
  `- $/quality-point (known new vs media-only ref): ${money((newTotalKnown / 8 - refMedia / 14) / (newQ - refQ))} — neférové (ref AI chybí)`,
);
L("- Poctivé total $ srovnání: Nelze určit z dostupných dat.");
L();

L("## 10. Zahozené náklady failed packages");
L();
L("| pkg | reason | attempts | est. waste | persisted |");
L("|---:|---|---:|---:|---|");
for (const p of failedNeu) {
  let err: any = {};
  try {
    err = JSON.parse(p.error_message || "{}");
  } catch {
    err = { message: p.error_message };
  }
  const att = err.attempts || 1;
  L(
    `| ${p.package_index} | ${esc(err.message || "")} | ${att} | ~${money(att * avgCompletedAi)} | none |`,
  );
}
L();
L(`**Součet odhadu waste:** ~${money(failedWasteEst)}`);
L();

L("## 11. Přínos komponent");
L();
L(
  "| Komponenta | Cena/čas | Zachytila | Zlepšila | Zablokovala | Přínos |",
);
L("|---|---|---|---|---|---|");
L("| Product Brain | Nelze oddělit | — | — | — | nedoložený |");
L(
  `| Direction gen | ${money(costBy["Creative Direction Generation"]?.cost)} | 7 dirs/pkg | metafory | — | střední |`,
);
L(
  "| Memory filter | v ideation | fingerprint collisions | diverzita | re-ideation cost | střední/negativní náklad |",
);
L(
  `| Direction eval | ${money(costBy["Creative Direction Evaluation"]?.cost)} | ranking | výběr | — | střední |`,
);
L(
  `| Ideation | ${money(costBy["Creative Ideation"]?.cost)} / ${((costBy["Creative Ideation"]?.ms || 0) / 60000).toFixed(1)}m | concepts | silnější hooks | — | **vysoký** |`,
);
L(
  "| Veto/re-ideation | attempts | slabé concepts | — | **pkg4 fail** | negativní |",
);
L(
  `| Critic | ${money((costBy["Creative Evaluation"]?.cost || 0) + (costBy["Creative Evaluation Retry"]?.cost || 0))} | 6 pkgs | drobné | — | nízký–střední |`,
);
L(
  "| Concept fidelity | $0 check | generic office | — | **pkg5,13** | negativní jako hard fail |",
);
L(
  `| Story integrity | repair ${money(costBy["Story Integrity Repair"]?.cost)} | actor drift | repair pkg2 | **pkg3,9** | smíšený |`,
);
L(
  `| Presentation gen | ${money(costBy["Presentation Generation"]?.cost)} | scény+VO | specificita | — | **vysoký** |`,
);
L("| Image/TTS/Render $ | worker cost=0 | — | — | — | nedoložený billing |");
L("| PDI / Narrative Beats | ~$0 | — | — | — | nedoložený |");
L();

L("## 12. Kandidáti na zjednodušení");
L();
L(
  "1. Hard fail `concept_fidelity` / `story_integrity` / `generic_office` → repair/advisory.",
);
L("2. Terminální veto loops (pkg4) → best-effort fallback.");
L("3. Fingerprint hard reject → soft penalty.");
L("4. Sloučit overlapping fidelity/integrity/office gates.");
L("5. Critic — slabý doložený vizuální přínos.");
L("6. PDI / Narrative Beats — nedoložené odděleně.");
L("7. Snížit max concepts/attempts u Ideation (nejdražší krok).");
L("8. Persistovat failed intermediate JSON do telemetry.");
L(
  "9. Pipeline je technicky sofistikovanější a u doručených vizuálně lepší, produktově horší kvůli fail rate.",
);
L();

L("## 13. Finální verdikt");
L();
L(
  "1. **Viditelně kvalitnější?** Ano u completed; ne jako celý run (6/14 nedoručeno).",
);
L(
  `2. **Dražší?** Known ${money(newTotalKnown)}; waste est ${money(failedWasteEst)}. Ref AI Nelze určit.`,
);
L(
  `3. **Pomalejší?** Wall/delivered ${min(summary.new.wall_duration_sec / 8)} vs ${min(summary.ref.wall_duration_sec / 14)} (${((((summary.new.wall_duration_sec / 8) / (summary.ref.wall_duration_sec / 14) - 1) * 100).toFixed(0))}%).`,
);
L(
  `4. **$/doručený:** known ${money(newTotalKnown / 8)}; +waste est ${money(newTotalWithWasteEst / 8)}.`,
);
L("5. **Kvalita vs cena?** Částečně pro ideation+presentation; ne s fail waste.");
L("6. **Kvalita vs completion?** **Ne** — 8≠14.");
L(
  "7. **Prokazatelný přínos:** Ideation, Direction, Presentation; částečně Integrity repair.",
);
L(
  "8. **Předimenzované:** hard fidelity/integrity/veto, overlapping validators, critic, PDI/beats.",
);
L(
  "9. **Bez hard fails:** vyšší completion, podobné winners, méně waste; riziko občas generic office.",
);
L(
  "10. **Doporučení:** **zjednodušit** (ne full rollback) — reliability starší pipeline + creative síla nové.",
);
L();
L("---");
L();
L("## Appendix — paths");
L();
L("- `docs/audits/run-comparison-c8dd3caf.md`");
L("- `docs/audits/run-comparison-c8dd3caf/data/`");
L("- `docs/audits/run-comparison-c8dd3caf/assets/`");
L("- `docs/audits/run-comparison-c8dd3caf/screenshots/`");
L("- `docs/audits/run-comparison-c8dd3caf/contact-sheets/`");
L(
  "- `reports/production-run-c8dd3caf-c407-418c-be49-d4cf0a3b7bf9-audit.md`",
);
L(
  "- `reports/production-run-f6c0c74d-1548-44fe-a920-b96b21d3db58-audit.md`",
);
L();

writeFileSync(resolve("docs/audits/run-comparison-c8dd3caf.md"), lines.join("\n"));
writeFileSync(
  resolve(root, "data/quality-scores.json"),
  JSON.stringify(
    {
      newScores,
      refScores,
      newQ,
      refQ,
      newTotalKnown,
      failedWasteEst,
      newTotalWithWasteEst,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      lines: lines.length,
      newQ,
      refQ,
      newTotalKnown,
      failedWasteEst,
      perDel: newTotalKnown / 8,
      perDelWaste: newTotalWithWasteEst / 8,
    },
    null,
    2,
  ),
);
