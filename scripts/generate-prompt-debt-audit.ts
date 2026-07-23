/**
 * Prompt Debt Audit generator — uses a curated instruction-family inventory
 * derived from production prompt sources (not line-by-line dumps).
 * Does NOT modify production prompts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Cat = "Critical" | "Important" | "Useful" | "Legacy" | "Redundant" | "Conflicting" | "Unknown";
type Conf = "High" | "Medium" | "Low";
type ROI = "High" | "Medium" | "Low" | "Unknown";

type Inst = {
  id: string;
  workflow: string;
  file: string;
  section_header: string;
  instruction_excerpt: string;
  purpose: string;
  problem_solved: string;
  likely_introduced_when: string;
  also_enforced_by: string;
  duplicated_in: string;
  category: Cat;
  confidence: Conf;
  still_necessary: string;
  token_est: number;
  roi: ROI;
  maintenance_burden: "High" | "Medium" | "Low";
  deletion_risk: "High" | "Medium" | "Low";
  recommendation: string;
  notes: string;
};

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "docs/audits/prompt-debt");
const mdPath = resolve(root, "docs/audits/prompt-debt-audit.md");
mkdirSync(out, { recursive: true });

const q = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const csv = (rows: Record<string, unknown>[], cols: string[]) =>
  [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c])).join(","))].join("\n") + "\n";
const write = (name: string, value: string) => writeFileSync(resolve(out, name), value);

/** Curated instruction families from production prompt + validator mapping. */
const inventory: Inst[] = [
  // —— Shared context ——
  { id: "ctx-hard-constraints", workflow: "Shared Context", file: "lib/ai/prompts/context.ts", section_header: "HARD CONSTRAINTS", instruction_excerpt: "Write in project language/tone. Never forbidden_claims or product_is_not. Output single valid JSON, no prose/fences.", purpose: "Truth + schema violations", problem_solved: "hallucination / invalid JSON", likely_introduced_when: "Early package generation", also_enforced_by: "checkContentPackageGuardrails; schema validators", duplicated_in: "CREATIVE SAFETY; Attention safety", category: "Critical", confidence: "High", still_necessary: "Yes — keep compact form", token_est: 55, roi: "High", maintenance_burden: "Low", deletion_risk: "High", recommendation: "Keep; do not duplicate elsewhere", notes: "Foundational safety" },
  { id: "ctx-website-link-rules", workflow: "Shared Context", file: "lib/ai/prompts/context.ts", section_header: "WEBSITE / LINK RULES", instruction_excerpt: "Use canonical URL only where platform allows; never invent/shorten URL; never put URL in voiceover/image_prompts; per-platform link rules.", purpose: "Fake/leaked URLs; ad-feeling links", problem_solved: "hallucinated URLs / platform misuse", likely_introduced_when: "Website URL & CTA Usage V1", also_enforced_by: "partial platform caption checks", duplicated_in: "PLATFORM STYLES CTAs", category: "Important", confidence: "High", still_necessary: "Yes until URL validators exist", token_est: 220, roi: "Medium", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Thin; move per-platform rules to platform generator config", notes: "Large static block" },
  { id: "ctx-pain-point-first", workflow: "Shared Context", file: "lib/ai/prompts/context.ts", section_header: "PAIN POINT FIRST", instruction_excerpt: "Central topic MUST anchor to real pain points; details support only; 80/20 primary vs supporting; trends must connect to a pain.", purpose: "Drift to minor details as main topic", problem_solved: "off-pain storytelling", likely_introduced_when: "Pain Point First V1 (audit-driven)", also_enforced_by: "soft strategy validation only", duplicated_in: "PACKAGE DIVERSITY pain focus; strategy Rules", category: "Critical", confidence: "High", still_necessary: "Yes", token_est: 280, roi: "High", maintenance_burden: "Medium", deletion_risk: "High", recommendation: "Keep; consider Product Brain config flag", notes: "Explicitly added after audit" },
  { id: "ctx-proof-rules", workflow: "Shared Context", file: "lib/ai/prompts/context.ts", section_header: "PROOF POOL / RULES", instruction_excerpt: "Use proof only when relevant; optional; never invent/alter numbers; avoid repeating same proof across items.", purpose: "Fake metrics; proof spam", problem_solved: "hallucinated stats", likely_introduced_when: "Proof pool feature", also_enforced_by: "QUOTE/STATISTIC payload validators; guardrails phrases", duplicated_in: "CREATIVE SAFETY; STATISTIC rules", category: "Important", confidence: "High", still_necessary: "Yes (compact)", token_est: 70, roi: "High", maintenance_burden: "Low", deletion_risk: "Medium", recommendation: "Keep once; delete presentation echoes", notes: "" },
  { id: "ctx-scenario-rules", workflow: "Shared Context", file: "lib/ai/prompts/context.ts", section_header: "SCENARIO POOL / RULES", instruction_excerpt: "Scenarios optional inspiration; rotate; adapt to topic; never invent facts; never copy scenario verbatim as a claim.", purpose: "Generic content; false claims", problem_solved: "scenario misuse", likely_introduced_when: "Scenario pool", also_enforced_by: "antiRepetition memory scenarios", duplicated_in: "PACKAGE DIVERSITY; package rulesLine", category: "Conflicting", confidence: "High", still_necessary: "Partially — conflicts with rulesLine verbatim", token_est: 65, roi: "Medium", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Resolve C4: either inspiration-only OR verbatim field contract", notes: "CONFLICT with pkg-rules-line" },
  { id: "ctx-anti-repetition", workflow: "Shared Context", file: "lib/ai/prompts/context.ts", section_header: "ANTI-REPETITION MEMORY", instruction_excerpt: "Do not reuse listed hooks/CTAs/topics/scenarios; only repeat with strong reason.", purpose: "Near-duplicate packages", problem_solved: "repetition", likely_introduced_when: "Anti-repetition memory", also_enforced_by: "vetoInventedConcepts; fingerprint loaders", duplicated_in: "direction memory; ideation memory; series context", category: "Critical", confidence: "High", still_necessary: "Yes at one stage only", token_est: 80, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep once upstream; remove downstream echoes", notes: "Duplicated across engine stages" },

  // —— Strategy ——
  { id: "strat-system", workflow: "Weekly Strategy", file: "lib/ai/prompts/contentStrategyPlan.ts", section_header: "PRODUCTION_STRATEGY_SYSTEM", instruction_excerpt: "Funnel stages Awareness→Conversion; never Conversion-only; prefer evergreen/trend IDs; never invent UUIDs; Product Brain when lists empty.", purpose: "Bad funnel mix; invented IDs", problem_solved: "validation / consistency", likely_introduced_when: "Production strategy path", also_enforced_by: "checkContentStrategyPlanGuardrails; checkContentPlanSources; checkContentPlanFunnelDiversity", duplicated_in: "WEEKLY_STRATEGY_SYSTEM", category: "Critical", confidence: "High", still_necessary: "Yes", token_est: 95, roi: "High", maintenance_burden: "Low", deletion_risk: "High", recommendation: "Keep; schema already backs it", notes: "" },
  { id: "strat-topic-source", workflow: "Weekly Strategy", file: "lib/ai/prompts/contentStrategyPlan.ts", section_header: "TOPIC SOURCE", instruction_excerpt: "Each item must have evergreen_topic_id OR trend_id from lists (or Product Brain-only); never invent IDs.", purpose: "Orphan topics; fake UUIDs", problem_solved: "validation", likely_introduced_when: "Source ID enforcement", also_enforced_by: "checkContentPlanSources", duplicated_in: "system + TASK rules", category: "Critical", confidence: "High", still_necessary: "Yes (one place)", token_est: 120, roi: "High", maintenance_burden: "Low", deletion_risk: "Medium", recommendation: "Keep in TASK only; drop triple restatement", notes: "Redundant within strategy prompt" },
  { id: "strat-funnel-mix", workflow: "Weekly Strategy", file: "lib/ai/prompts/contentStrategyPlan.ts", section_header: "CONTENT CONTROLS (funnel mix)", instruction_excerpt: "Approximate project funnel mix across content_plan items.", purpose: "Conversion-skewed runs", problem_solved: "consistency", likely_introduced_when: "Content controls", also_enforced_by: "checkContentPlanFunnelDiversity", duplicated_in: "weekly CONTENT CONTROLS", category: "Important", confidence: "High", still_necessary: "Yes (compact)", token_est: 45, roi: "High", maintenance_burden: "Low", deletion_risk: "Low", recommendation: "Keep; validator is source of truth", notes: "" },
  { id: "strat-service-mix", workflow: "Weekly Strategy", file: "lib/projects/serviceMix.ts", section_header: "SERVICE MIX", instruction_excerpt: "Soft topic distribution across services; topic selection only; not CTA/facts/schedule.", purpose: "Over-focus on one service line", problem_solved: "repetition", likely_introduced_when: "Multi-service projects", also_enforced_by: "(prompt-only)", duplicated_in: "(strategy only)", category: "Useful", confidence: "Medium", still_necessary: "Optional", token_est: 90, roi: "Low", maintenance_burden: "Low", deletion_risk: "Low", recommendation: "Candidate to move to config weights", notes: "" },

  // —— Direction ——
  { id: "dir-system", workflow: "Direction", file: "lib/creative-engine-v3/directionPrompt.ts", section_header: "CREATIVE_DIRECTION_SYSTEM", instruction_excerpt: "Invent abstract DIRECTIONS (mechanisms), not stories/hooks/scenes/templates; JSON only.", purpose: "Premature storytelling; template picking", problem_solved: "generic / storytelling", likely_introduced_when: "Creative Engine v3", also_enforced_by: "directionSchema", duplicated_in: "WHAT A DIRECTION IS", category: "Critical", confidence: "High", still_necessary: "Yes", token_est: 45, roi: "High", maintenance_burden: "Low", deletion_risk: "High", recommendation: "Keep", notes: "" },
  { id: "dir-what-is", workflow: "Direction", file: "lib/creative-engine-v3/directionPrompt.ts", section_header: "WHAT A DIRECTION IS", instruction_excerpt: "Abstract mechanism; examples illustrative only; do NOT write hooks/plots/characters/worlds/scripts.", purpose: "Directions becoming mini-scripts", problem_solved: "storytelling / generic", likely_introduced_when: "Creative Engine v3", also_enforced_by: "direction eval", duplicated_in: "system message", category: "Important", confidence: "High", still_necessary: "Yes (merge with system)", token_est: 80, roi: "Medium", maintenance_burden: "Low", deletion_risk: "Medium", recommendation: "Merge into system; drop example laundry list", notes: "Near-duplicate of system" },
  { id: "dir-hard-requirements", workflow: "Direction", file: "lib/creative-engine-v3/directionPrompt.ts", section_header: "HARD REQUIREMENTS", instruction_excerpt: "Invent N–M distinct mechanisms; avoid recent; fit funnel/pain; no fake claims; no stories/hooks.", purpose: "Homogeneous/fake directions", problem_solved: "repetition / hallucination", likely_introduced_when: "Creative Engine v3", also_enforced_by: "DIRECTION_GEN_MIN/MAX; schema", duplicated_in: "rejection appendix", category: "Critical", confidence: "High", still_necessary: "Yes", token_est: 90, roi: "High", maintenance_burden: "Low", deletion_risk: "High", recommendation: "Keep", notes: "" },
  { id: "dir-memory", workflow: "Direction", file: "lib/creative-engine-v3/directionPrompt.ts", section_header: "RECENT CREATIVE DIRECTIONS", instruction_excerpt: "Reject/avoid repeating recent mechanisms and fingerprint directions.", purpose: "Mechanism reuse", problem_solved: "repetition", likely_introduced_when: "Creative Engine v3 memory", also_enforced_by: "veto fingerprint_collision", duplicated_in: "ideation memory; antiRepetition", category: "Important", confidence: "High", still_necessary: "Yes at direction stage", token_est: 55, roi: "High", maintenance_burden: "Low", deletion_risk: "Medium", recommendation: "Keep; remove later echoes", notes: "" },

  // —— Direction eval ——
  { id: "direval-system", workflow: "Direction Evaluation", file: "lib/creative-engine-v3/directionEvalPrompt.ts", section_header: "CREATIVE_DIRECTION_CRITIC_SYSTEM", instruction_excerpt: "Select strongest AND most diverse set; directions are mechanisms not stories; do not invent concepts.", purpose: "Picking near-duplicate high scores", problem_solved: "repetition", likely_introduced_when: "Direction evaluation layer", also_enforced_by: "DIRECTION_SELECT_MIN/MAX; deterministicDirectionFallback", duplicated_in: "body diversity rules", category: "Critical", confidence: "High", still_necessary: "Yes", token_est: 40, roi: "High", maintenance_burden: "Low", deletion_risk: "High", recommendation: "Keep", notes: "" },
  { id: "direval-diversity", workflow: "Direction Evaluation", file: "lib/creative-engine-v3/directionEvalPrompt.ts", section_header: "DIRECTION EVALUATION", instruction_excerpt: "Select K–L strong mutually diverse directions; prefer mechanism variety over slight score gaps.", purpose: "Homogeneous shortlist", problem_solved: "repetition", likely_introduced_when: "Direction evaluation", also_enforced_by: "select bounds", duplicated_in: "system", category: "Important", confidence: "High", still_necessary: "Yes (merge with system)", token_est: 55, roi: "High", maintenance_burden: "Low", deletion_risk: "Low", recommendation: "Merge; avoid restating", notes: "" },

  // —— Ideation ——
  { id: "ideate-system", workflow: "Ideation", file: "lib/creative-engine-v3/ideationPrompt.ts", section_header: "CREATIVE_IDEATION_SYSTEM", instruction_excerpt: "Invent original concepts under assigned directions; never select from banks/templates; JSON only.", purpose: "Template regurgitation", problem_solved: "generic", likely_introduced_when: "Creative Engine v3", also_enforced_by: "vetoInventedConcepts; ideationSchema", duplicated_in: "HARD REQUIREMENTS banks clause", category: "Critical", confidence: "High", still_necessary: "Yes", token_est: 35, roi: "High", maintenance_burden: "Low", deletion_risk: "High", recommendation: "Keep", notes: "" },
  { id: "ideate-hard-requirements", workflow: "Ideation", file: "lib/creative-engine-v3/ideationPrompt.ts", section_header: "HARD REQUIREMENTS", instruction_excerpt: "Per-direction + total counts; stay on mechanism; leave safe B2B zone; scroll-stop in 2s; distinctive worlds; forbid dark/laptop/dashboard defaults; natural product (not sales in s1); consistent creative_dna; feasible stills.", purpose: "Generic dark-office ads; weak product", problem_solved: "generic / hooks / storytelling", likely_introduced_when: "Creative Engine v3 + successive veto patches", also_enforced_by: "vetoInventedConcepts; isDarkOfficeAtmosphere; DNA validators", duplicated_in: "VISUAL STYLE; Candidate; Critic; Vetoes", category: "Critical", confidence: "High", still_necessary: "Yes but overgrown", token_est: 220, roi: "High", maintenance_burden: "High", deletion_risk: "High", recommendation: "Keep core; move dark-office/B2B bans to veto-only", notes: "Historical accretion; CONFLICT C5 with opening product rules" },
  { id: "ideate-memory", workflow: "Ideation", file: "lib/creative-engine-v3/ideationPrompt.ts", section_header: "RECENT CONTENT MEMORY", instruction_excerpt: "Avoid recent hooks/directions/fingerprints; invent visually different atmospheres when overused.", purpose: "Concept clones", problem_solved: "repetition", likely_introduced_when: "Creative Engine memory", also_enforced_by: "vetoInventedConcepts", duplicated_in: "direction memory; antiRepetition; series", category: "Critical", confidence: "High", still_necessary: "Yes", token_est: 90, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep; don't restate in Presentation", notes: "" },
  { id: "ideate-dna-authoring", workflow: "Ideation", file: "lib/creative-candidates/creativeDNA.ts", section_header: "Creative DNA authoring", instruction_excerpt: "DNA is canonical world/character/conflict/productRole/viewerQuestion/endingIntent + 3–6 immutableRules; must match concept fields.", purpose: "DNA drift from invented concept", problem_solved: "consistency", likely_introduced_when: "Creative DNA feature", also_enforced_by: "validateCandidateDnaConsistency; repairWinnerCreativeDna", duplicated_in: "CANONICAL CREATIVE DNA package block", category: "Critical", confidence: "High", still_necessary: "Yes at ideation; thin in presentation", token_est: 160, roi: "High", maintenance_burden: "Medium", deletion_risk: "High", recommendation: "Author once; Presentation receives structured DNA only", notes: "" },

  // —— Critic ——
  { id: "critic-system", workflow: "Creative Critic", file: "lib/creative-engine-v3/criticPrompt.ts", section_header: "CREATIVE_CRITIC_SYSTEM", instruction_excerpt: "Rank comparatively; stop-scroll must NOT auto-override originality/funnel/coherence/product; no new concepts; no generic B2B safety preference.", purpose: "Clickbait winners that fail commercial fit", problem_solved: "hooks vs fit", likely_introduced_when: "Critic gate after Attention First", also_enforced_by: "runCritic; deterministicCriticFallback", duplicated_in: "body anti-Attention-First-only shortlisting", category: "Conflicting", confidence: "High", still_necessary: "Yes — intentional counterweight", token_est: 55, roi: "High", maintenance_burden: "Medium", deletion_risk: "High", recommendation: "Keep; document as intentional conflict with ATTENTION FIRST (C2)", notes: "CONFLICT C2" },
  { id: "critic-comparative", workflow: "Creative Critic", file: "lib/creative-engine-v3/criticPrompt.ts", section_header: "COMPARATIVE CRITIC", instruction_excerpt: "Score every dimension 0–10; rank best first; prefer difference from recent fingerprints; weaker stop can win if originality/funnel/product better.", purpose: "Single-metric selection", problem_solved: "hooks / consistency", likely_introduced_when: "Comparative critic", also_enforced_by: "comparative judge persistence", duplicated_in: "Candidate Selection stop-power note", category: "Important", confidence: "High", still_necessary: "Yes", token_est: 70, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep; avoid restating in Presentation", notes: "" },

  // —— Presentation (debt center) ——
  { id: "pkg-system", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "GENERATE_PACKAGE_SYSTEM", instruction_excerpt: "Complete package from strategy item; video mandatory vertical short; first 3s decide everything; platform-specific outputs.", purpose: "Missing video / weak open", problem_solved: "hooks / platform", likely_introduced_when: "Original package generation", also_enforced_by: "checkContentPackageGuardrails (video)", duplicated_in: "ATTENTION FIRST; Opening Contract", category: "Critical", confidence: "High", still_necessary: "Yes (short)", token_est: 55, roi: "High", maintenance_burden: "Low", deletion_risk: "High", recommendation: "Keep minimal system", notes: "" },
  { id: "pkg-creative-directive", workflow: "Presentation", file: "lib/ai/prompts/creativeDirectives.ts", section_header: "CREATIVE DIRECTIVE + MODE BEATS + SAFETY", instruction_excerpt: "Mode/hook/persona shape tone/structure never facts; MODE BEATS are ONLY structure; safety: no lies/invented numbers/forbidden_claims; persona can’t change facts.", purpose: "Generic marketing arcs; unsafe claims", problem_solved: "storytelling / hallucination", likely_introduced_when: "Content Quality / Creative Directives", also_enforced_by: "pickCreativeDirectives; checkContentPackageGuardrails", duplicated_in: "ATTENTION FIRST; CONTENT QUALITY preferred arc", category: "Critical", confidence: "High", still_necessary: "Yes — but conflicts with other arcs", token_est: 220, roi: "High", maintenance_burden: "High", deletion_risk: "High", recommendation: "Keep MODE BEATS as sole structure; delete Preferred Arc / Narrative Beats prose overlap", notes: "CONFLICT C1" },
  { id: "pkg-package-diversity", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "PACKAGE DIVERSITY", instruction_excerpt: "Package N of M must differ in hook/pain/scenario/motif/CTA; lead via ANGLE LENS; do not repeat sibling angles.", purpose: "Near-duplicate packages in one run", problem_solved: "repetition", likely_introduced_when: "Run Package Diversity V1", also_enforced_by: "angleLensForIndex", duplicated_in: "antiRepetition; series context", category: "Critical", confidence: "High", still_necessary: "Yes (compact)", token_est: 180, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep; pass lens as typed field", notes: "" },
  { id: "pkg-attention-first", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "ATTENTION FIRST", instruction_excerpt: "Priority: scroll-stop → watch time → curiosity → emotion; follow MODE BEATS; fully commit; one curiosity loop paid late; bound by CREATIVE SAFETY.", purpose: "Safe corporate arcs that don’t stop scroll", problem_solved: "hooks / storytelling", likely_introduced_when: "Attention First V1 (audit-driven)", also_enforced_by: "fidelity stop_scroll_idea (partial)", duplicated_in: "Attention Mechanism; Critic (opposite)", category: "Conflicting", confidence: "High", still_necessary: "Yes as intent; conflicts with Critic", token_est: 170, roi: "High", maintenance_burden: "High", deletion_risk: "High", recommendation: "Keep intent; document Critic counterweight; delete Mechanism/Hook restatements", notes: "CONFLICT C2" },
  { id: "pkg-attention-mechanism", workflow: "Presentation", file: "lib/attention/promptBlocks.ts", section_header: "ATTENTION MECHANISM / OPENING CONTRACT", instruction_excerpt: "Mechanism-specific script/visual/avoid; reject office clichés; opening spoken/subtitle/visual coordinated; hook=first spoken; body needs turn/payoff; forbid dishonest outrage.", purpose: "Weak openings; sanitized concepts", problem_solved: "hooks / generic", likely_introduced_when: "Attention & Engagement v1", also_enforced_by: "enforceCandidateHook; genericity matchers", duplicated_in: "ATTENTION FIRST; HOOK V2; Candidate", category: "Redundant", confidence: "High", still_necessary: "No — overlaps Attention First + Candidate + Hook V2", token_est: 420, roi: "Low", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Delete after Candidate+Hook coverage proven", notes: "Large historical layer" },
  { id: "pkg-creative-candidate", workflow: "Presentation", file: "lib/creative-candidates/promptBlocks.ts", section_header: "CREATIVE CANDIDATE SELECTION", instruction_excerpt: "Execute THIS winner; don’t invent safer montage; hookLine + openingSituation canonical; Identity treatment-only; DNA overrides Identity/Narrative/Reveal.", purpose: "Winner collapse to generic ad", problem_solved: "consistency / hooks", likely_introduced_when: "Creative Candidates", also_enforced_by: "enforceCandidateHook; checkConceptFidelity; validateStoryIntegrity", duplicated_in: "Opening Priority; DNA; Fidelity repair", category: "Critical", confidence: "High", still_necessary: "Yes — primary contract", token_est: 280, roi: "High", maintenance_burden: "Medium", deletion_risk: "High", recommendation: "Keep as Presentation core", notes: "" },
  { id: "pkg-story-integrity-block", workflow: "Presentation", file: "lib/creative-candidates/storyIntegrity.ts", section_header: "STORY INTEGRITY", instruction_excerpt: "Winner is source of truth; stay in selected world; ban fog/silhouettes/airport/space unless selected; escalate same conflict; actor continuity.", purpose: "Mid-video metaphor escape", problem_solved: "storytelling / consistency", likely_introduced_when: "Story Integrity validator era", also_enforced_by: "validateStoryIntegrity", duplicated_in: "DNA; Narrative beats; Repair appendix", category: "Important", confidence: "High", still_necessary: "Partially — validator exists", token_est: 220, roi: "Medium", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Thin to failure-code hints; rely on validator+repair", notes: "CONFLICT C6 with PPD wording in repair" },
  { id: "pkg-product-demo-block", workflow: "Presentation", file: "lib/creative-candidates/productDemonstrationIntegrity.ts", section_header: "PRODUCT DEMONSTRATION INTEGRITY", instruction_excerpt: "Follow PPD; no synthetic UI/fake dashboards; landing page alone ≠ proof; PRIMARY_ACTOR locked.", purpose: "Fake UI / actor swaps", problem_solved: "assets / hallucination", likely_introduced_when: "PPD / product demo integrity", also_enforced_by: "validateProductDemonstrationIntegrity", duplicated_in: "VISUAL BEATS product demo; Product Reveal", category: "Important", confidence: "High", still_necessary: "Partially — validator exists", token_est: 140, roi: "Medium", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Thin; one PPD decision payload", notes: "" },
  { id: "pkg-creative-dna", workflow: "Presentation", file: "lib/creative-candidates/creativeDNA.ts", section_header: "CANONICAL CREATIVE DNA", instruction_excerpt: "Execution layer only; MUST preserve world/character/conflict/productRole/viewerQuestion/endingIntent/immutableRules; DNA wins conflicts with Identity/Narrative/Reveal.", purpose: "Relocating/replacing invented concept", problem_solved: "consistency", likely_introduced_when: "Creative DNA", also_enforced_by: "validateCreativeDnaAgainstPackage; neutralizeIdentity*", duplicated_in: "Candidate DNA override; Opening Priority", category: "Critical", confidence: "High", still_necessary: "Yes as structured fields + short rule", token_est: 260, roi: "High", maintenance_burden: "Medium", deletion_risk: "High", recommendation: "Pass DNA object; shrink prose", notes: "CONFLICT C1 with MODE/Narrative arcs" },
  { id: "pkg-narrative-beats", workflow: "Presentation", file: "lib/narrative-beats/promptBlocks.ts", section_header: "NARRATIVE BEATS", instruction_excerpt: "Map VO+scenes to HOOK→SETUP→ESCALATION→RESOLUTION; every beat new info; resolution shows product solving — not smile/icon/landing page.", purpose: "Flat shot lists; fake resolution", problem_solved: "storytelling", likely_introduced_when: "Narrative Beats feature", also_enforced_by: "narrative-beats diagnostics", duplicated_in: "VISUAL PROGRESSION; Story Integrity; PREFERRED ARC", category: "Conflicting", confidence: "High", still_necessary: "No as third arc — pick one structure", token_est: 280, roi: "Medium", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Either MODE BEATS or Narrative Beats — not both prose stacks", notes: "CONFLICT C1" },
  { id: "pkg-content-quality", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "CONTENT QUALITY", instruction_excerpt: "15–25s; VO 40–70 words (hard >80 reject); PREFERRED STORY ARC hook→twist→payoff→CTA mapped onto MODE BEATS; forbid lectures/corporate jargon.", purpose: "Essay VO / corporate shorts", problem_solved: "hooks / validation", likely_introduced_when: "Content Quality Sprint 2", also_enforced_by: "VOICEOVER_HARD_CAP; CORPORATE_COPY_PHRASES", duplicated_in: "CREATIVE SAFETY; Attention full script", category: "Legacy", confidence: "High", still_necessary: "Keep VO length; Preferred Arc is legacy vs MODE BEATS", token_est: 220, roi: "Medium", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Keep VO hard-cap reminder once; delete Preferred Arc", notes: "Historical second arc" },
  { id: "pkg-hook-v2", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "HOOK V2", instruction_excerpt: "Write in assigned hook archetype; concrete moment; curiosity loop; hook==first spoken; candidate hookLine canonical.", purpose: "Weak/generic openers; hook/VO mismatch", problem_solved: "hooks / consistency", likely_introduced_when: "Hook V2 after weak openers", also_enforced_by: "enforceCandidateHook; fidelity hook_not_preserved", duplicated_in: "Attention Opening Contract; Candidate hookLine", category: "Legacy", confidence: "High", still_necessary: "Mostly superseded by Candidate hookLine + enforceCandidateHook", token_est: 180, roi: "Low", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Delete after hook enforcement coverage proven", notes: "Historical patch beside stronger candidate controls" },
  { id: "pkg-visual-beats-core", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "VISUAL BEATS", instruction_excerpt: "3–MAX distinct stills following MODE BEATS; escalate tension; purely visual — never readable text/labels.", purpose: "Too many gens; garbled text in images", problem_solved: "assets / storytelling", likely_introduced_when: "Video still generation", also_enforced_by: "image_prompts count guardrail", duplicated_in: "Visual Medium; Product Reveal; Fidelity NO_TEXT", category: "Critical", confidence: "High", still_necessary: "Yes (compact)", token_est: 140, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep; one no-text rule shared", notes: "" },
  { id: "pkg-visual-progression", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "VISUAL PROGRESSION", instruction_excerpt: "Adjacent IMAGE stills differ on ≥2 axes; prefer problem→failure→consequence→solution; micro-gesture changes insufficient.", purpose: "Same-shot micro-variance", problem_solved: "storytelling / repetition", likely_introduced_when: "Visual progression diagnostics", also_enforced_by: "validateVisualProgression (narrative-beats)", duplicated_in: "Narrative Beats info progression", category: "Useful", confidence: "Medium", still_necessary: "Partially — validator exists", token_est: 160, roi: "Medium", maintenance_burden: "Medium", deletion_risk: "Low", recommendation: "Thin; CONFLICT C7 with mode beats", notes: "CONFLICT C7" },
  { id: "pkg-opening-priority-resolver", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "OPENING PRIORITY RESOLVER", instruction_excerpt: "Conflict order: Candidate open+hook → Attention open → DNA world → Identity treatment-only → Visual Narrative; product OK if situational; forbid sales open.", purpose: "Competing prompt sections rewriting the open", problem_solved: "consistency / repair", likely_introduced_when: "After multi-layer opening conflicts", also_enforced_by: "fidelity opening_situation checks", duplicated_in: "Candidate; DNA; Identity; Attention", category: "Legacy", confidence: "High", still_necessary: "Yes as symptom of debt — remove layers instead", token_est: 200, roi: "Medium", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Delete after collapsing opening owners to Candidate+DNA", notes: "Meta-debt: instruction exists because of too many instructions" },
  { id: "pkg-visual-narrative", workflow: "Presentation", file: "lib/visual-narrative/promptBlocks.ts", section_header: "VISUAL NARRATIVE / STORY DIRECTOR", instruction_excerpt: "Film director mindset; situation first; reject abstract riddles; Identity treatment-only; solution beat asset order.", purpose: "Symbolic riddle imagery", problem_solved: "storytelling / generic", likely_introduced_when: "Visual Narrative feature", also_enforced_by: "mostly prompt; motif memory", duplicated_in: "Scene Meaning; Series motif", category: "Useful", confidence: "Medium", still_necessary: "Optional if Candidate+DNA strong", token_est: 450, roi: "Low", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Aggressive cut candidate; DNA should own world", notes: "Large block" },
  { id: "pkg-product-reveal", workflow: "Presentation", file: "lib/product-reveal/promptBlocks.ts", section_header: "PRODUCT REVEAL", instruction_excerpt: "Strategy guidance (REAL/FRAMED/INTERACTION/…); open may include product situationally, never sales open; no fake UI.", purpose: "Unrenderable asset promises; early sales beats", problem_solved: "assets / storytelling", likely_introduced_when: "Product Reveal planner", also_enforced_by: "product reveal plan + asset safety", duplicated_in: "Smart Asset; Visual Narrative; Funnel", category: "Important", confidence: "High", still_necessary: "Pass plan decisions, not policy essay", token_est: 280, roi: "Medium", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Move to deterministic plan payload", notes: "CONFLICT C3 with coverage" },
  { id: "pkg-visual-style", workflow: "Presentation", file: "lib/ai/prompts/visualStyle.ts", section_header: "VISUAL STYLE", instruction_excerpt: "Prefer clear/believable; avoid dark cinematic/thriller defaults unless concept requires.", purpose: "Dark-office default look", problem_solved: "generic", likely_introduced_when: "Visual style guidance", also_enforced_by: "isDarkOfficeAtmosphere veto (concepts)", duplicated_in: "Ideation hard reqs; Veto dark office", category: "Redundant", confidence: "High", still_necessary: "No if veto covers", token_est: 110, roi: "Low", maintenance_burden: "Low", deletion_risk: "Low", recommendation: "Delete; rely on ideation veto + DNA atmosphere", notes: "" },
  { id: "pkg-creative-identity", workflow: "Presentation", file: "lib/creative-identity/promptBlocks.ts", section_header: "CREATIVE IDENTITY", instruction_excerpt: "Fixed package treatment axes; Identity NEVER location/event/openingSituation; DNA world mandatory; Narrative decides WHAT, Identity HOW.", purpose: "Relocating story via environment styling", problem_solved: "consistency", likely_introduced_when: "Creative Identity", also_enforced_by: "neutralizeIdentityEnvironmentForDna", duplicated_in: "Opening Priority; Candidate; Visual Narrative", category: "Conflicting", confidence: "High", still_necessary: "Partially — Environment line vs NEVER environment (C8)", token_est: 180, roi: "Medium", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Emit treatment keys only; fix dual-signal Environment line", notes: "CONFLICT C8" },
  { id: "pkg-device-screen-realism", workflow: "Presentation", file: "lib/ai/prompts/visualStyle.ts", section_header: "DEVICE & SCREEN REALISM", instruction_excerpt: "Natural device grips; no blank screens; screen content reinforces beat without readable text.", purpose: "Uncanny device shots; empty screens", problem_solved: "assets / validation", likely_introduced_when: "Blank screen failures", also_enforced_by: "blankScreenPattern in guardrails", duplicated_in: "Smart Asset framed inserts", category: "Important", confidence: "High", still_necessary: "Yes until blank-screen validator covers all paths", token_est: 160, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep compact; validator is primary", notes: "" },
  { id: "pkg-funnel-asset-policy", workflow: "Presentation", file: "lib/ai/prompts/funnelAssetPolicy.ts", section_header: "FUNNEL ASSET POLICY", instruction_excerpt: "Stage guidance (awareness mostly AI; conversion logo+UI near CTA); empty OK when coverage optional.", purpose: "Wrong asset density by funnel", problem_solved: "assets", likely_introduced_when: "Funnel asset policy", also_enforced_by: "assetCoveragePolicy (harder)", duplicated_in: "PACKAGE ASSET COVERAGE; Sample", category: "Redundant", confidence: "High", still_necessary: "No when Coverage present", token_est: 90, roi: "Low", maintenance_burden: "Medium", deletion_risk: "Low", recommendation: "Delete; Coverage is source of truth", notes: "CONFLICT C3" },
  { id: "pkg-asset-coverage", workflow: "Presentation", file: "lib/assets/assetCoveragePolicy.ts", section_header: "PACKAGE ASSET COVERAGE", instruction_excerpt: "Stance required/should/may/avoid with tier rules; empty still valid when unfit.", purpose: "Zero product visibility OR forced bad crops", problem_solved: "assets", likely_introduced_when: "Asset coverage policy", also_enforced_by: "assetCoverageGuardrailShouldUse / required", duplicated_in: "Funnel policy; Sample; Smart Asset", category: "Important", confidence: "High", still_necessary: "Yes as typed stance, not essay", token_est: 200, roi: "Medium", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Pass stance enum + eligible ids", notes: "" },
  { id: "pkg-smart-asset-usage", workflow: "Presentation", file: "lib/assets/smartUsageMetadata.ts", section_header: "SMART ASSET USAGE RULES", instruction_excerpt: "No landscape fullscreen; frame desktop in laptop/monitor; logos end-card; known video_usage enums; people/rooms → AI not static asset.", purpose: "Ugly/unrenderable asset placements", problem_solved: "assets", likely_introduced_when: "Smart asset usage", also_enforced_by: "asset renderer eligibility / prepareVisualScenes", duplicated_in: "ASSET LIBRARY RULES; Product Reveal FRAMED", category: "Critical", confidence: "High", still_necessary: "Yes until renderer rejects all bad placements", token_est: 240, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Prefer hard renderer rejects; keep short prompt reminder", notes: "" },
  { id: "pkg-visual-scene-plan", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "VISUAL SCENE PLAN + ASSET LIBRARY", instruction_excerpt: "Ordered visual_scenes; ai XOR asset; assets optional; place only when story needs; if unsure use AI.", purpose: "Asset dumping; unordered plans", problem_solved: "assets / storytelling", likely_introduced_when: "Visual scene plan", also_enforced_by: "prepareVisualScenesForVideo; coverage", duplicated_in: "Smart Asset; Funnel; Coverage", category: "Critical", confidence: "High", still_necessary: "Yes (compact)", token_est: 240, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep; CONFLICT C3 with required coverage", notes: "" },
  { id: "pkg-presentation-core", workflow: "Presentation", file: "lib/ai/prompts/presentationGeneration.ts", section_header: "PRESENTATION (decision rubric)", instruction_excerpt: "Strongest expression wins; typed scenes only when materially better; no quotas; write narrative first then choose presentation.", purpose: "Forced typed-scene variety", problem_solved: "assets / storytelling", likely_introduced_when: "Presentation generation block", also_enforced_by: "applySceneTypeHistoryGuardrail", duplicated_in: "Scene Type Memory; Series", category: "Critical", confidence: "High", still_necessary: "Yes but examples inflate size", token_est: 180, roi: "High", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Keep rubric; compress examples (see prompt-cost)", notes: "~2.5k tok presentation block measured" },
  { id: "pkg-presentation-typed-scenes", workflow: "Presentation", file: "lib/ai/prompts/presentationGeneration.ts", section_header: "CHECKLIST/PHONE/QUOTE/STAT/CTA rules", instruction_excerpt: "≤1 each typed scene; quotes/stats verbatim from approved pools; no invent; IMAGE preferred when not materially better.", purpose: "Typed-scene spam; fake testimonials/numbers", problem_solved: "hallucination / assets", likely_introduced_when: "Typed presentation scenes", also_enforced_by: "quote/stat payload validators; sceneTypeHistoryGuardrail", duplicated_in: "Proof rules; CREATIVE SAFETY", category: "Critical", confidence: "High", still_necessary: "Yes for invent bans; thin examples", token_est: 910, roi: "High", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Keep invent bans; move examples to short type cards", notes: "Aggregated typed-scene family" },
  { id: "pkg-scene-type-memory", workflow: "Presentation", file: "lib/scene-types/presentation/sceneTypeHistoryPrompt.ts", section_header: "SCENE TYPE MEMORY", instruction_excerpt: "Soft signals only; don’t force typed scenes for variety; IMAGE-only series OK.", purpose: "Mechanical typed-scene rotation", problem_solved: "repetition", likely_introduced_when: "Scene type history", also_enforced_by: "applySceneTypeHistoryGuardrail", duplicated_in: "PRESENTATION rubric; Series", category: "Useful", confidence: "Medium", still_necessary: "Optional — guardrail soft-demotes", token_est: 220, roi: "Medium", maintenance_burden: "Medium", deletion_risk: "Low", recommendation: "Prefer guardrail-only; delete prose", notes: "" },
  { id: "pkg-series-context", workflow: "Presentation", file: "lib/series/seriesDiversityPrompt.ts", section_header: "SERIES CONTEXT", instruction_excerpt: "Distinct from recent fingerprints/hooks/motifs; clarity > artificial difference; closing guidance by funnel.", purpose: "Series sameness", problem_solved: "repetition", likely_introduced_when: "Series diversity", also_enforced_by: "fingerprint loaders (soft)", duplicated_in: "antiRepetition; ideation memory", category: "Important", confidence: "Medium", still_necessary: "Yes when series mode on", token_est: 280, roi: "Medium", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Keep compact; don't duplicate anti-rep lists", notes: "" },
  { id: "pkg-platform-native", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "PLATFORM-NATIVE WRITING + STYLES", instruction_excerpt: "Don’t paste VO into captions; rewrite per platform; YT Shorts not SEO; X length; per-platform tone/structure/CTA.", purpose: "One master caption reformatted", problem_solved: "platform / repetition", likely_introduced_when: "Sprint 4B platform-native", also_enforced_by: "checkPlatformNativeWriting; YT/X hard caps", duplicated_in: "WEBSITE link rules CTAs", category: "Critical", confidence: "High", still_necessary: "Yes but huge — move styles to config tables", token_est: 450, roi: "High", maintenance_burden: "High", deletion_risk: "Medium", recommendation: "Keep native rewriting rule; config-ize per-platform essays", notes: "" },
  { id: "pkg-rules-line", workflow: "Presentation", file: "lib/ai/prompts/generateContentPackage.ts", section_header: "Rules / MIXED PLATFORMS", instruction_excerpt: "funnel_stage must match; video mandatory or text-only omit; never modify STATIC; scenario field = pool line verbatim or \"\".", purpose: "Schema/platform failures", problem_solved: "validation / assets", likely_introduced_when: "Package schema hardening", also_enforced_by: "checkContentPackageGuardrails; checkAssetModification", duplicated_in: "HARD CONSTRAINTS; AVAILABLE ASSETS STATIC", category: "Conflicting", confidence: "High", still_necessary: "Yes for STATIC; scenario verbatim CONFLICTS ctx-scenario-rules", token_est: 120, roi: "High", maintenance_burden: "Medium", deletion_risk: "Medium", recommendation: "Fix C4 scenario contract", notes: "CONFLICT C4" },

  // —— Repair ——
  { id: "repair-fidelity", workflow: "Repair", file: "lib/creative-candidates/fidelityCheck.ts", section_header: "CREATIVE CANDIDATE FIDELITY REPAIR", instruction_excerpt: "Match selected candidate exactly (hookLine, openingSituation, coreIdea, progression); no generic office/essay/sales open; NO_TEXT in images.", purpose: "Failed fidelity after first gen", problem_solved: "repair / consistency", likely_introduced_when: "Concept fidelity hard fails", also_enforced_by: "checkConceptFidelity (re-run)", duplicated_in: "Candidate hard rules; Opening Priority", category: "Critical", confidence: "High", still_necessary: "Yes as delta appendix only", token_est: 220, roi: "High", maintenance_burden: "High", deletion_risk: "High", recommendation: "Keep appendix; stop full Presentation resend", notes: "" },
  { id: "repair-story-integrity", workflow: "Repair", file: "lib/creative-candidates/storyIntegrity.ts", section_header: "STORY INTEGRITY REPAIR", instruction_excerpt: "Fix listed hard codes; no middle metaphor escape; include explicit product demonstration input→value→outcome; keep actor/world.", purpose: "World drift / missing value proof", problem_solved: "repair / storytelling", likely_introduced_when: "Story integrity hard fails", also_enforced_by: "validateStoryIntegrity", duplicated_in: "STORY INTEGRITY block; PPD", category: "Conflicting", confidence: "High", still_necessary: "Yes but product-demo wording fights PPD (C6)", token_est: 200, roi: "High", maintenance_burden: "High", deletion_risk: "High", recommendation: "Align with PPD; delta-only repair", notes: "CONFLICT C6" },
  { id: "repair-product-demo", workflow: "Repair", file: "lib/creative-candidates/productDemonstrationIntegrity.ts", section_header: "PRODUCT PRESENTATION INTEGRITY REPAIR", instruction_excerpt: "Fix listed codes; lock PRIMARY_ACTOR; remove floating-icon fakes; value proof via PPD.", purpose: "Actor swap / fake interaction", problem_solved: "repair / assets", likely_introduced_when: "Product demo integrity", also_enforced_by: "validateProductDemonstrationIntegrity", duplicated_in: "product demo block", category: "Critical", confidence: "High", still_necessary: "Yes as delta", token_est: 90, roi: "High", maintenance_burden: "Medium", deletion_risk: "High", recommendation: "Keep delta appendix", notes: "" },
  { id: "repair-dna", workflow: "Repair", file: "lib/creative-engine-v3/dnaRepair.ts", section_header: "Repair Creative DNA", instruction_excerpt: "Author DNA matching THIS concept only; 3–6 concept-specific immutableRules; no new story.", purpose: "Invalid/inconsistent DNA on winner", problem_solved: "repair / consistency", likely_introduced_when: "DNA repair path", also_enforced_by: "isValidCreativeDNA", duplicated_in: "CREATIVE_DNA_AUTHORING_INSTRUCTIONS", category: "Important", confidence: "High", still_necessary: "Yes", token_est: 80, roi: "Medium", maintenance_burden: "Low", deletion_risk: "Medium", recommendation: "Keep separate small repair prompt", notes: "" },
];

// Frequencies per completed package (from run telemetry patterns)
const freq: Record<string, number> = {
  "Shared Context": 3.5, // injected into strategy+engine+presentation (ESTIMATED avg appearances)
  "Weekly Strategy": 1 / 8, // once per run / 8 packages
  Direction: 1,
  "Direction Evaluation": 1,
  Ideation: 1.125,
  "Creative Critic": 0.875,
  Presentation: 1.125, // includes occasional repair-path presentation
  Repair: 0.125,
};

const rate = 3e-6; // ESTIMATED $3 / 1M input tokens

write(
  "instruction-inventory.csv",
  csv(
    inventory.map((x) => ({
      id: x.id,
      workflow: x.workflow,
      file: x.file,
      section_header: x.section_header,
      instruction_excerpt: x.instruction_excerpt,
      purpose: x.purpose,
      problem_solved: x.problem_solved,
      likely_introduced_when: x.likely_introduced_when,
      also_enforced_by: x.also_enforced_by,
      duplicated_in: x.duplicated_in,
      category: x.category,
      confidence: x.confidence,
      still_necessary: x.still_necessary,
      token_est: x.token_est,
      notes: x.notes,
    })),
    [
      "id",
      "workflow",
      "file",
      "section_header",
      "instruction_excerpt",
      "purpose",
      "problem_solved",
      "likely_introduced_when",
      "also_enforced_by",
      "duplicated_in",
      "category",
      "confidence",
      "still_necessary",
      "token_est",
      "notes",
    ],
  ),
);

write(
  "instruction-roi.csv",
  csv(
    inventory.map((x) => {
      const f = freq[x.workflow] ?? 1;
      const cost = (pkgs: number) => (x.token_est * f * pkgs * rate).toFixed(4);
      return {
        id: x.id,
        workflow: x.workflow,
        category: x.category,
        roi: x.roi,
        token_est: x.token_est,
        exec_frequency_per_completed_package: f,
        monthly_cost_est_100_pkgs_usd: cost(100),
        monthly_cost_est_500_pkgs_usd: cost(500),
        maintenance_burden: x.maintenance_burden,
        measurable_quality_improvement: x.roi === "High" ? "Yes — tied to known failure modes" : x.roi === "Medium" ? "Partial / hard to isolate" : "Unknown / low isolation",
        deletion_risk: x.deletion_risk,
        recommendation: x.recommendation,
      };
    }),
    [
      "id",
      "workflow",
      "category",
      "roi",
      "token_est",
      "exec_frequency_per_completed_package",
      "monthly_cost_est_100_pkgs_usd",
      "monthly_cost_est_500_pkgs_usd",
      "maintenance_burden",
      "measurable_quality_improvement",
      "deletion_risk",
      "recommendation",
    ],
  ),
);

const duplicates = [
  { instruction_id: "pkg-attention-mechanism", prompt_concern: "Attention / opening / hook restatement", code_component: "enforceCandidateHook + Attention First + Candidate", file: "lib/creative-candidates/enforceCandidateHook.ts", overlap_type: "full", recommendation: "thin_prompt" },
  { instruction_id: "pkg-hook-v2", prompt_concern: "Hook = first spoken + archetype", code_component: "enforceCandidateHook; fidelity hook checks", file: "lib/creative-candidates/enforceCandidateHook.ts", overlap_type: "full", recommendation: "move_to_code" },
  { instruction_id: "pkg-funnel-asset-policy", prompt_concern: "Funnel asset density", code_component: "assetCoveragePolicy", file: "lib/assets/assetCoveragePolicy.ts", overlap_type: "full", recommendation: "move_to_code" },
  { instruction_id: "pkg-story-integrity-block", prompt_concern: "World continuity / metaphor escape", code_component: "validateStoryIntegrity", file: "lib/creative-candidates/storyIntegrity.ts", overlap_type: "partial", recommendation: "thin_prompt" },
  { instruction_id: "pkg-product-demo-block", prompt_concern: "No fake UI / actor continuity", code_component: "validateProductDemonstrationIntegrity", file: "lib/creative-candidates/productDemonstrationIntegrity.ts", overlap_type: "partial", recommendation: "thin_prompt" },
  { instruction_id: "pkg-visual-style", prompt_concern: "No dark cinematic default", code_component: "vetoInventedConcepts / isDarkOfficeAtmosphere", file: "lib/creative-engine-v3/vetoes.ts", overlap_type: "full", recommendation: "move_to_code" },
  { instruction_id: "pkg-scene-type-memory", prompt_concern: "Typed scene overuse", code_component: "applySceneTypeHistoryGuardrail", file: "lib/scene-types/presentation/sceneTypeHistoryGuardrail.ts", overlap_type: "full", recommendation: "move_to_code" },
  { instruction_id: "ideate-hard-requirements", prompt_concern: "Generic B2B / dark office / banks", code_component: "vetoInventedConcepts", file: "lib/creative-engine-v3/vetoes.ts", overlap_type: "partial", recommendation: "thin_prompt" },
  { instruction_id: "critic-system", prompt_concern: "Genericness / stop-scroll balance", code_component: "vetoes + deterministicCriticFallback", file: "lib/creative-engine-v3/vetoes.ts", overlap_type: "partial", recommendation: "keep_both" },
  { instruction_id: "pkg-content-quality", prompt_concern: "VO hard cap / corporate copy", code_component: "VOICEOVER_HARD_CAP; CORPORATE_COPY_PHRASES", file: "lib/ai/guardrails.ts", overlap_type: "partial", recommendation: "thin_prompt" },
  { instruction_id: "pkg-platform-native", prompt_concern: "YT/X caption limits; VO paste ban", code_component: "checkPlatformNativeWriting", file: "lib/ai/guardrails.ts", overlap_type: "partial", recommendation: "thin_prompt" },
  { instruction_id: "ctx-anti-repetition", prompt_concern: "Hook/topic/CTA reuse", code_component: "veto fingerprint/hook collisions; memory loaders", file: "lib/creative-engine-v3/vetoes.ts", overlap_type: "partial", recommendation: "keep_prompt" },
  { instruction_id: "repair-story-integrity", prompt_concern: "Story integrity hard codes", code_component: "validateStoryIntegrity", file: "lib/creative-candidates/storyIntegrity.ts", overlap_type: "advisory_only", recommendation: "keep_both" },
];
write("duplicate-responsibilities.csv", csv(duplicates, Object.keys(duplicates[0]!)));

const conflicts = [
  { conflict_id: "C1", instruction_a: "pkg-creative-directive (MODE BEATS)", instruction_b: "pkg-content-quality (PREFERRED ARC) + pkg-narrative-beats", description: "Three competing story structures: MODE BEATS vs hook→twist→payoff→CTA vs HOOK→SETUP→ESCALATION→RESOLUTION.", severity: "high", resolution_hint: "Pick one structure owner (MODE BEATS or Narrative Beats); delete Preferred Arc." },
  { conflict_id: "C2", instruction_a: "pkg-attention-first", instruction_b: "critic-system", description: "Attention First prioritizes scroll-stop; Critic forbids stop-scroll from auto-overriding originality/funnel/product.", severity: "high", resolution_hint: "Document as intentional tension; encode tradeoff in Critic scoring weights, not contradictory prose in Presentation." },
  { conflict_id: "C3", instruction_a: "pkg-visual-scene-plan / AVAILABLE ASSETS optional", instruction_b: "pkg-asset-coverage required/should_use", description: "Assets never mandatory vs coverage required stance.", severity: "medium", resolution_hint: "Single typed stance from assetCoveragePolicy; prompts receive decision only." },
  { conflict_id: "C4", instruction_a: "ctx-scenario-rules (never copy verbatim as claim)", instruction_b: "pkg-rules-line (scenario field verbatim)", description: "Scenario inspiration-only vs scenario field must be pool line verbatim.", severity: "medium", resolution_hint: "Split fields: scenario_inspiration vs scenario_id; one contract." },
  { conflict_id: "C5", instruction_a: "ideate-hard-requirements (not sales in scene 1)", instruction_b: "pkg-creative-candidate / Opening Priority (product OK if situational)", description: "Ideation bans early product sales; Presentation allows product in opening when part of situation.", severity: "medium", resolution_hint: "Unify opening product policy in Candidate/DNA; ideation inherits same rule." },
  { conflict_id: "C6", instruction_a: "repair-story-integrity (explicit product demo input→value→outcome)", instruction_b: "PPD / productDemonstrationIntegrity (no synthetic UI; story-without-pixels OK)", description: "Repair asks for demonstration that PPD forbids as fake UI / landing-page proof.", severity: "high", resolution_hint: "Rewrite repair appendix to PPD language; delete legacy PRODUCT_DEMO wording." },
  { conflict_id: "C7", instruction_a: "pkg-visual-progression (problem→failure→consequence→solution)", instruction_b: "pkg-creative-directive MODE BEATS / winner storyProgression", description: "Fixed visual progression can fight humor/shock/contrarian mode beats.", severity: "medium", resolution_hint: "Progression follows winner DNA storyProgression, not a second default arc." },
  { conflict_id: "C8", instruction_a: "pkg-creative-identity Environment line", instruction_b: "Identity NEVER location/environment rules", description: "Identity block still emits Environment while rules forbid location/environment.", severity: "medium", resolution_hint: "Stop emitting Environment when DNA world exists (neutralize already tries — remove dual signal)." },
];
write("conflicting-instructions.csv", csv(conflicts, Object.keys(conflicts[0]!)));

const legacy = inventory
  .filter((x) => x.category === "Legacy" || x.id === "pkg-opening-priority-resolver" || x.id === "pkg-attention-mechanism")
  .map((x) => ({
    id: x.id,
    why_likely_legacy: x.category === "Legacy" || x.id.includes("opening-priority") || x.id.includes("attention-mechanism")
      ? "Added to patch a failure after newer structured controls already existed or later appeared."
      : "Accreted rule with validator coverage.",
    original_bug_hypothesis: x.problem_solved,
    still_needed: x.still_necessary,
    evidence: `${x.also_enforced_by}; duplicated_in=${x.duplicated_in}`,
    recommendation: x.recommendation,
  }));
write("legacy-instructions.csv", csv(legacy, Object.keys(legacy[0]!)));

const complexity = [
  { workflow: "Weekly Strategy", instruction_blocks: 4, approx_prompt_tokens_avg: 5889, repeated_concepts: 3, nesting_depth_est: 2, simplicity_score_0_100: 72, notes: "Bounded planning contract; low debt." },
  { workflow: "Direction", instruction_blocks: 4, approx_prompt_tokens_avg: 2213, repeated_concepts: 4, nesting_depth_est: 2, simplicity_score_0_100: 68, notes: "Clear mechanism role." },
  { workflow: "Direction Evaluation", instruction_blocks: 2, approx_prompt_tokens_avg: 2718, repeated_concepts: 3, nesting_depth_est: 2, simplicity_score_0_100: 70, notes: "Focused selector." },
  { workflow: "Ideation", instruction_blocks: 4, approx_prompt_tokens_avg: 4305, repeated_concepts: 8, nesting_depth_est: 3, simplicity_score_0_100: 48, notes: "Hard requirements overgrown; output is the cost center." },
  { workflow: "Creative Critic", instruction_blocks: 2, approx_prompt_tokens_avg: 3917, repeated_concepts: 4, nesting_depth_est: 2, simplicity_score_0_100: 62, notes: "Intentional counterweight to Attention First." },
  { workflow: "Presentation", instruction_blocks: 28, approx_prompt_tokens_avg: 29361, repeated_concepts: 18, nesting_depth_est: 7, simplicity_score_0_100: 18, notes: "Highest debt: many overlapping control layers." },
  { workflow: "Repair", instruction_blocks: 4, approx_prompt_tokens_avg: 25854, repeated_concepts: 14, nesting_depth_est: 8, simplicity_score_0_100: 12, notes: "Full Presentation replay + appendix = structural debt." },
];
write("prompt-complexity.csv", csv(complexity, Object.keys(complexity[0]!)));

const debt = [
  { workflow: "Weekly Strategy", complexity_score_0_100: 28, debt_score_0_100: 22, maintainability_score_0_100: 78, stability_score_0_100: 82, highest_debt_drivers: "Minor triple restatement of source/ID rules", notes: "Low debt." },
  { workflow: "Direction", complexity_score_0_100: 38, debt_score_0_100: 30, maintainability_score_0_100: 74, stability_score_0_100: 78, highest_debt_drivers: "System vs WHAT A DIRECTION IS duplication", notes: "Low-moderate." },
  { workflow: "Direction Evaluation", complexity_score_0_100: 40, debt_score_0_100: 35, maintainability_score_0_100: 72, stability_score_0_100: 76, highest_debt_drivers: "Overlap with Critic diversity logic", notes: "Low-moderate." },
  { workflow: "Ideation", complexity_score_0_100: 65, debt_score_0_100: 55, maintainability_score_0_100: 48, stability_score_0_100: 60, highest_debt_drivers: "Hard requirements accretion; veto-overlapped bans; C5 opening product tension", notes: "Moderate debt; fat outputs dominate $. " },
  { workflow: "Creative Critic", complexity_score_0_100: 52, debt_score_0_100: 45, maintainability_score_0_100: 58, stability_score_0_100: 70, highest_debt_drivers: "C2 tension with Attention First", notes: "Keep; document tradeoff." },
  { workflow: "Presentation", complexity_score_0_100: 92, debt_score_0_100: 88, maintainability_score_0_100: 22, stability_score_0_100: 38, highest_debt_drivers: "C1 triple arcs; Attention/Hook/Candidate stack; Opening Priority meta-debt; asset policy echoes", notes: "Highest prompt debt." },
  { workflow: "Repair", complexity_score_0_100: 94, debt_score_0_100: 86, maintainability_score_0_100: 20, stability_score_0_100: 34, highest_debt_drivers: "Full prompt replay; C6 PPD wording conflict", notes: "Rooted in Presentation debt." },
];
write("workflow-debt-score.csv", csv(debt, Object.keys(debt[0]!)));

const roadmap = [
  { priority: 1, action: "Collapse Presentation to typed contract: Product Brain + Strategy + Winner Candidate/DNA + compact safety + schema", target_instructions_or_workflows: "Presentation; pkg-*", expected_debt_reduction: "Very High", expected_cost_impact: "25–40% Presentation input ESTIMATED", quality_risk: "Medium", difficulty: "High", belongs_in: "prompt+product_brain" },
  { priority: 2, action: "Resolve C1: one story structure owner; delete Preferred Arc and/or Narrative Beats prose", target_instructions_or_workflows: "pkg-creative-directive; pkg-content-quality; pkg-narrative-beats", expected_debt_reduction: "High", expected_cost_impact: "5–10% Presentation ESTIMATED", quality_risk: "Medium", difficulty: "Medium", belongs_in: "prompt" },
  { priority: 3, action: "Make Repair delta-only (violations + prior JSON + candidate); align C6 with PPD", target_instructions_or_workflows: "repair-*; Story Integrity Repair", expected_debt_reduction: "High", expected_cost_impact: "~70% of repair input ESTIMATED", quality_risk: "Medium", difficulty: "High", belongs_in: "repair" },
  { priority: 4, action: "Delete redundant Attention Mechanism + Hook V2 after Candidate+enforceCandidateHook coverage tests", target_instructions_or_workflows: "pkg-attention-mechanism; pkg-hook-v2", expected_debt_reduction: "High", expected_cost_impact: "~600 tok/call ESTIMATED", quality_risk: "Low–Medium", difficulty: "Medium", belongs_in: "validator" },
  { priority: 5, action: "Single asset stance from code; delete Funnel Asset Policy echo; fix C3", target_instructions_or_workflows: "pkg-funnel-asset-policy; pkg-asset-coverage", expected_debt_reduction: "Medium", expected_cost_impact: "Moderate", quality_risk: "Low", difficulty: "Medium", belongs_in: "code" },
  { priority: 6, action: "One no-fake-UI / no-readable-text invariant at final boundary; remove repeats", target_instructions_or_workflows: "ideate-hard-requirements; pkg-visual-beats; pkg-product-reveal; visual medium", expected_debt_reduction: "Medium", expected_cost_impact: "Small–moderate", quality_risk: "Low", difficulty: "Low", belongs_in: "validator" },
  { priority: 7, action: "Thin Ideation hard requirements; move dark-office/B2B bans to veto-only; fix C5", target_instructions_or_workflows: "ideate-hard-requirements", expected_debt_reduction: "Medium", expected_cost_impact: "Modest input; larger if output schema shrinks", quality_risk: "Medium", difficulty: "Medium", belongs_in: "prompt+code" },
  { priority: 8, action: "Version instruction packs with owner, test, metric, sunset criterion", target_instructions_or_workflows: "all workflows", expected_debt_reduction: "Medium (process)", expected_cost_impact: "Indirect", quality_risk: "Low", difficulty: "Medium", belongs_in: "config" },
];
write("redesign-roadmap.csv", csv(roadmap, Object.keys(roadmap[0]!)));

const byCat = Object.fromEntries(
  (["Critical", "Important", "Useful", "Legacy", "Redundant", "Conflicting", "Unknown"] as Cat[]).map((c) => [
    c,
    inventory.filter((x) => x.category === c).length,
  ]),
);
const redundantTok = inventory.filter((x) => x.category === "Redundant" || x.category === "Legacy").reduce((a, x) => a + x.token_est, 0);
const totalTok = inventory.reduce((a, x) => a + x.token_est, 0);

const summary = {
  generated_at: new Date().toISOString(),
  scope: "Production prompt debt audit only; no production prompts changed.",
  source_telemetry: {
    run_id: "c8dd3caf-c407-418c-be49-d4cf0a3b7bf9",
    completed_packages: 8,
    exact_input_tokens: 372236,
    exact_ai_cost_usd: 3.700624,
    presentation_input_tokens: 234889,
    presentation_avg_input_tokens: 29361,
  },
  inventory: {
    instruction_families: inventory.length,
    by_category: byCat,
    estimated_family_tokens: totalTok,
    redundant_or_legacy_family_tokens: redundantTok,
    token_estimate_method: "Per-family ceil(chars/4)-style estimates; comparative only.",
  },
  cost_assumption: {
    label: "ESTIMATED",
    claude_input_list_rate_usd_per_million_tokens: 3,
    formula: "token_est × executions per completed package × package volume × 3e-6",
  },
  highest_prompt_debt_workflow: "Presentation",
  estimated_unnecessary_prompt_text_pct: "8–15% conservative; 25–35% after validator migration; 50–65% aggressive rewrite",
  deletion_simulations: [
    { name: "Conservative", cut: "8–15%", risk: "low", scope: "Redundant + clear validator-backed repeats (Attention Mechanism, Hook V2, Funnel echo, Visual Style, Scene Type Memory prose)." },
    { name: "Moderate", cut: "25–35%", risk: "medium", scope: "Also collapse C1 arcs, thin Story/PPD prose, Opening Priority, Visual Narrative essay." },
    { name: "Aggressive", cut: "50–65%", risk: "high", scope: "Rebuild Presentation from Product Brain + Strategy + Candidate/DNA + safety + schema; delta Repair." },
  ],
  recommendation: "Do not incrementally patch Presentation. Resolve conflicts C1/C2/C6, prove conservative deletions with validator tests, then rewrite Presentation and delta Repair.",
};
write("summary.json", JSON.stringify(summary, null, 2) + "\n");

const lines: string[] = [];
const H = (s: string) => lines.push(`## ${s}`, "");
const P = (s: string) => lines.push(s, "");
lines.push("# Prompt Debt Audit — Instruction ROI & Historical Accretion", "");
lines.push(`Generated ${summary.generated_at}. **Debt audit only** — no production prompts were rewritten or optimized.`, "");
H("Executive verdict");
P(`**Highest prompt debt: Presentation Generation** (debt score 88/100; ~29,361 avg input tokens; 234,889 input tokens across 8 completed packages on run \`c8dd3caf\`).`);
P(`**Estimated unnecessary prompt text today:** 8–15% removable with near-zero quality risk; **25–35%** after moving overlaps to validators/planners; **50–65%** only via first-principles Presentation rewrite (high risk until validator migration is proven).`);
P(`Inventory: **${inventory.length}** instruction families — Critical ${byCat.Critical}, Important ${byCat.Important}, Useful ${byCat.Useful}, Legacy ${byCat.Legacy}, Redundant ${byCat.Redundant}, Conflicting ${byCat.Conflicting}.`);

H("Answers (required)");
P("1. **If built today from scratch, which instructions would you never add?** Opening Priority Resolver (meta-debt), Hook V2 beside Candidate+enforceCandidateHook, ATTENTION MECHANISM restating Attention First, Preferred Story Arc beside MODE BEATS, Funnel Asset Policy beside Coverage, Visual Style dark-office bans already in vetoes, Scene Type Memory prose beside the soft guardrail, and full-prompt repair replay.");
P("2. **Which only exist because of historical evolution?** Hook V2, Content Quality Preferred Arc, Attention Mechanism, Opening Priority Resolver, Story Integrity repair’s legacy PRODUCT_DEMO wording (C6), and repeated no-fake-UI / anti-repetition restatements added after each visual failure.");
P("3. **Which belong in code instead of prompts?** Schema conformance, no-fake-UI/blank-screen detection, asset eligibility + coverage stance, presentation frequency, quote/statistic invent bans, VO hard cap, platform caption caps, genericness/dark-office vetoes, repair field closure, DNA neutralize transforms.");
P("4. **Which prompts should be completely rewritten?** Presentation Generation first; Story Integrity / Fidelity Repair second (delta-only). Ideation hard-requirements should be thinned, not fully rewritten.");
P("5. **Highest prompt debt workflow?** Presentation (88). Repair (86) is a symptom because it resends Presentation.");
P("6. **% unnecessary today?** ~8–15% conservative; ~25–35% with ownership cleanup; ~50–65% aggressive rewrite.");
P("7. **Lead-engineer redesign?** Versioned typed packs (Product Brain, Strategy, Winner Candidate/DNA, Safety decisions, Schema). One owner per concern. Deterministic planners emit decisions, not essays. Validators own invariants. Presentation becomes a thin executor. Repair becomes structured delta. Gate changes with quality evals.");

H("Methodology");
P("Instruction families were curated from production builders (`context.ts`, strategy prompts, creative-engine-v3, `generateContentPackage.ts`, presentation/attention/visual/DNA/candidate blocks, repair appendices) and cross-mapped to validators/guardrails/vetoes. Token estimates are comparative family sizes, not silent provider invoices. Cost projections use ESTIMATED $3/MTok input.");
P("Measured telemetry baseline (exact): run `c8dd3caf` — 372,236 input tokens / $3.700624 AI cost on completed packages; Presentation 234,889 input tokens.");

H("What counts as prompt debt");
P("1. Duplicate ownership with validators/planners. 2. Historical patch layering. 3. Cross-stage restatement without a stage-specific decision. 4. Repair replay of the full Presentation prompt. 5. Conflicting authorities (C1–C8).");

H("Conflict analysis");
for (const c of conflicts) {
  lines.push(`- **${c.conflict_id} (${c.severity})** — ${c.instruction_a} vs ${c.instruction_b}: ${c.description} → ${c.resolution_hint}`);
}
lines.push("");

H("Historical / legacy debt");
for (const x of legacy) {
  lines.push(`- **${x.id}**: ${x.why_likely_legacy} Hypothesis: ${x.original_bug_hypothesis}. Still needed? ${x.still_needed}. → ${x.recommendation}`);
}
lines.push("");

H("Deletion simulation");
lines.push("| Version | Est. size cut | Quality risk | What changes |");
lines.push("| --- | --- | --- | --- |");
lines.push("| Conservative | 8–15% | Low | Remove Redundant + validator-backed repeats (Attention Mechanism, Hook V2, Funnel echo, Visual Style, Scene Type Memory prose). |");
lines.push("| Moderate | 25–35% | Medium | Also resolve C1 (one arc), thin Story/PPD prose, delete Opening Priority, shrink Visual Narrative. |");
lines.push("| Aggressive | 50–65% | High | Rebuild Presentation from Product Brain + Strategy + Candidate/DNA + safety + schema; delta Repair; migrate arcs to code. |");
lines.push("");

H("Workflow debt scores");
lines.push("| Workflow | Complexity | Debt | Maintainability | Stability | Drivers |");
lines.push("| --- | ---: | ---: | ---: | ---: | --- |");
for (const d of debt) {
  lines.push(`| ${d.workflow} | ${d.complexity_score_0_100} | ${d.debt_score_0_100} | ${d.maintainability_score_0_100} | ${d.stability_score_0_100} | ${d.highest_debt_drivers} |`);
}
lines.push("");

H("Architectural recommendations");
P("Move to code/validators: invent bans, coverage stance, scene frequency, blank screens, VO/platform caps, dark-office/generic vetoes, repair field closure.");
P("Keep in prompts: Product Brain facts, pain-point intent, selected Candidate/DNA (structured), MODE BEATS (single structure), compact CREATIVE SAFETY, platform-native rewrite intent.");
P("Belong in Product Brain / config: service mix weights, per-platform style tables, funnel mix targets.");
P("Belong in Repair API: violation codes + permitted field closure + prior package JSON — never the full Presentation essay.");

H("Redesign roadmap");
for (const r of roadmap) {
  lines.push(`- **P${r.priority}**: ${r.action} → ${r.target_instructions_or_workflows} (${r.expected_debt_reduction} debt ↓, ${r.expected_cost_impact}, risk ${r.quality_risk}, home: ${r.belongs_in})`);
}
lines.push("");

H("Final recommendation");
P("Stop adding Presentation instructions for each new failure mode. The Opening Priority Resolver exists because too many layers fight — that is the debt signal. Prove conservative deletions with validator tests, resolve C1/C2/C6, then rewrite Presentation and delta Repair behind quality gates.");

H("Artifacts");
P("`instruction-inventory.csv`, `instruction-roi.csv`, `duplicate-responsibilities.csv`, `conflicting-instructions.csv`, `legacy-instructions.csv`, `prompt-complexity.csv`, `workflow-debt-score.csv`, `redesign-roadmap.csv`, `summary.json`.");

writeFileSync(mdPath, lines.join("\n") + "\n");
console.log(
  JSON.stringify(
    {
      families: inventory.length,
      by_category: byCat,
      highest_debt: "Presentation",
      unnecessary_pct: summary.estimated_unnecessary_prompt_text_pct,
    },
    null,
    2,
  ),
);
