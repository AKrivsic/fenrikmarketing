// Presentation Analyzer — deterministic permissions + eligibility (Phase 3).
//   npm run check:presentation-analyzer

import assert from "node:assert/strict";
import {
  DEFAULT_SCENE_TYPE,
  type SceneType,
} from "@/lib/scene-types/sceneType";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import {
  deriveAllowedSceneTypes,
  ensureImageInAllowed,
} from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import {
  deriveProjectPresentationSignals,
  type ProjectAssetSignal,
} from "@/lib/scene-types/presentation/projectSignals";
import { isImageScenePayload } from "@/lib/scene-types/imageScenePayload";
import { visualSceneToPlanItem } from "@/lib/scene-types/normalizeVisualScene";
import type { Json } from "@/lib/supabase/types";
import { emptyKnowledge } from "@/lib/knowledge/types";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import { resetChecklistProductionRolloutCacheForTests } from "@/lib/scene-types/checklistProductionRollout";

const ROLLOUT_TEST_PROJECT_ID = "11111111-1111-4111-8111-111111111111";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

function knowledgeWithProof(statements: string[]): Json {
  const k = emptyKnowledge("approved", "manual");
  k.cards.proof.statements = statements;
  return k as unknown as Json;
}
const emptyProof = buildProofIndex(
  emptyKnowledge("approved", "manual") as unknown as Json,
);

const localServiceSignals = deriveProjectPresentationSignals({
  project: {
    product_is: ["Restaurant dining experience"],
    product_strengths: ["Fresh ingredients"],
  },
  assets: [],
});

const saasSignals = deriveProjectPresentationSignals({
  project: {
    product_is: ["Mobile SaaS app for teams"],
    product_strengths: ["In-app chat"],
  },
  assets: [
    {
      id: "mobile-asset-1",
      title: "App home screen",
      mobileUi: true,
      phonePresentation: true,
    },
  ],
});

function projectCeiling(...types: SceneType[]): SceneType[] {
  return ensureImageInAllowed(types);
}

function analyze(
  scenes: VisualScene[],
  voiceoverText: string,
  opts: {
    proof?: ReturnType<typeof buildProofIndex>;
    signals?: ReturnType<typeof deriveProjectPresentationSignals>;
    allowed?: ReturnType<typeof deriveAllowedSceneTypes>;
    packageCtaText?: string;
    projectId?: string;
  } = {},
) {
  return analyzePresentation({
    scenes,
    allowedSceneTypes:
      opts.allowed ??
      deriveAllowedSceneTypes(
        {
          knowledge: {},
          proof: opts.proof ?? emptyProof,
          projectSignals: opts.signals ?? localServiceSignals,
        },
        { sceneTypesEnabled: true },
      ),
    voiceoverText,
    proof: opts.proof ?? emptyProof,
    projectSignals: opts.signals ?? localServiceSignals,
    packageCtaText: opts.packageCtaText ?? null,
    projectId: opts.projectId,
  });
}

const imageScene = (id: string, prompt: string): VisualScene => ({
  id,
  type: "IMAGE",
  payload: { media: { source: "ai", image_prompt: prompt } },
});

check("1 IMAGE-only restaurant scenes unchanged", () => {
  const scenes = [
    imageScene("scene-1", "Cozy restaurant interior"),
    imageScene("scene-2", "Chef plating food"),
  ];
  const r = analyze(scenes, "Welcome to our restaurant. Fresh food every day.");
  assert.equal(r.scenes.length, 2);
  assert.equal(r.scenes[0]?.type, "IMAGE");
  assert.equal(r.decisions.every((d) => d.rule === "allowed"), true);
});

check("2 IMAGE-only beauty unchanged", () => {
  const r = analyze(
    [imageScene("scene-1", "Salon styling chair")],
    "Book your appointment today.",
  );
  assert.equal(r.scenes[0]?.type, "IMAGE");
  assert.equal(r.decisions[0]?.final_type, "IMAGE");
});

check("3 CHECKLIST supported by narration — stays CHECKLIST when enabled", () => {
  const prevMode = process.env.CHECKLIST_GENERATION_MODE;
  const prev = process.env.SCENE_TYPES_ENABLED;
  const prevAllow = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
  process.env.CHECKLIST_GENERATION_MODE = "enabled";
  process.env.SCENE_TYPES_ENABLED = "true";
  process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_TEST_PROJECT_ID;
  resetChecklistProductionRolloutCacheForTests();
  try {
    const vo =
      "Avoid three booking mistakes: late arrivals, wrong party size, and missing deposits.";
    const r = analyze(
      [
        {
          id: "scene-1",
          type: "CHECKLIST",
          payload: {
            items: ["late arrivals", "wrong party size", "missing deposits"],
          },
        },
      ],
      vo,
      {
        allowed: deriveAllowedSceneTypes(
          { knowledge: {}, proof: emptyProof, projectSignals: saasSignals },
          { sceneTypesEnabled: true },
        ),
        projectId: ROLLOUT_TEST_PROJECT_ID,
      },
    );
    assert.equal(r.decisions[0]?.requested_type, "CHECKLIST");
    assert.equal(r.decisions[0]?.rule, "allowed");
    assert.equal(r.decisions[0]?.final_type, "CHECKLIST");
    assert.equal(r.scenes[0]?.type, "CHECKLIST");
  } finally {
    if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
    else process.env.CHECKLIST_GENERATION_MODE = prevMode;
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
    if (prevAllow === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevAllow;
    resetChecklistProductionRolloutCacheForTests();
  }
});

check("4 CHECKLIST invented items downgrade", () => {
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "CHECKLIST",
        payload: { items: ["quantum flux", "orbital widgets", "moon cheese"] },
      },
    ],
    "We serve great coffee.",
  );
  assert.equal(r.decisions[0]?.final_type, "IMAGE");
  assert.equal(
    r.decisions[0]?.rule,
    "checklist_not_supported_by_narration",
  );
});

check("5 STATISTIC with approved proof — accepted when renderer on", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
  const proof = buildProofIndex(
    knowledgeWithProof(["42% of inquiries arrive outside business hours."]),
  );
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "STATISTIC",
        payload: {
          value: "42",
          unit: "%",
          label: "of inquiries arrive outside business hours",
          proof_id: "proof-statement-0",
        },
      },
    ],
    "42% of inquiries arrive outside business hours for many teams.",
    {
      proof,
      allowed: deriveAllowedSceneTypes(
        { knowledge: {}, proof, projectSignals: saasSignals },
        { sceneTypesEnabled: true },
      ),
    },
  );
  assert.equal(r.decisions[0]?.requested_type, "STATISTIC");
  assert.equal(r.decisions[0]?.rule, "allowed");
  assert.equal(r.decisions[0]?.final_type, "STATISTIC");
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

check("6 STATISTIC without matching proof downgrades", () => {
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "STATISTIC",
        payload: {
          value: "90",
          unit: "%",
          label: "happier customers",
          proof_id: "proof-statement-missing",
        },
      },
    ],
    "Customers love us.",
    {
      allowed: projectCeiling("STATISTIC", "CTA", "CHECKLIST"),
      proof: buildProofIndex(knowledgeWithProof(["Real metric 40% faster replies."])),
    },
  );
  assert.equal(r.decisions[0]?.rule, "statistic_proof_not_found");
});

check("7 QUOTE with approved proof accepted", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
  const proof = buildProofIndex(
    knowledgeWithProof([
      "This app saved our team hours every week. — Alex, operations lead",
    ]),
  );
  const quoteText = "This app saved our team hours every week.";
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "QUOTE",
        payload: {
          quote: quoteText,
          attribution: "Alex, operations lead",
          proof_id: "proof-statement-0",
        },
      },
    ],
    "Hear from a customer who uses the app every week.",
    {
      proof,
      allowed: deriveAllowedSceneTypes(
        { knowledge: {}, proof, projectSignals: saasSignals },
        { sceneTypesEnabled: true },
      ),
    },
  );
  assert.equal(r.decisions[0]?.rule, "allowed");
  assert.equal(r.decisions[0]?.final_type, "QUOTE");
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

check("8 fabricated QUOTE downgrades", () => {
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "QUOTE",
        payload: {
          quote: "Best product ever invented by humanity.",
          attribution: "Fake Person",
          proof_id: "proof-statement-0",
        },
      },
    ],
    "Try our service.",
    {
      allowed: projectCeiling("QUOTE", "CTA", "CHECKLIST"),
      proof: buildProofIndex(knowledgeWithProof(["Real metric 40%"])),
    },
  );
  assert.equal(r.decisions[0]?.rule, "quote_proof_not_found");
});

check("9 PHONE with mobile asset accepted", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
  const assets: ProjectAssetSignal[] = [
    {
      id: "mobile-asset-1",
      title: "App UI",
      mobileUi: true,
      phonePresentation: true,
    },
  ];
  const signals = deriveProjectPresentationSignals({
    project: { product_is: ["Mobile SaaS app"], product_strengths: [] },
    assets,
  });
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "PHONE",
        payload: {
          asset_id: "mobile-asset-1",
          caption: "AI replies instantly.",
        },
      },
    ],
    "Open the app to see your chat inbox.",
    {
      signals,
      allowed: deriveAllowedSceneTypes(
        { knowledge: {}, proof: emptyProof, projectSignals: signals },
        { sceneTypesEnabled: true },
      ),
    },
  );
  assert.equal(r.decisions[0]?.rule, "allowed");
  assert.equal(r.decisions[0]?.final_type, "PHONE");
  assert.equal(r.scenes[0]?.type, "PHONE");
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

check("10 PHONE without mobile capability downgrades", () => {
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "PHONE",
        payload: { screen: { image_prompt: "phone with app" } },
      },
    ],
    "Enjoy our cozy dining room.",
    {
      allowed: projectCeiling("PHONE", "CTA", "CHECKLIST"),
      signals: localServiceSignals,
    },
  );
  assert.equal(r.decisions[0]?.rule, "phone_mobile_capability_missing");
});

check("11 CTA matching package CTA accepted", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "CTA",
        payload: { headline: "Book a demo", button_label: "Book now" },
      },
    ],
    "Ready to book a demo?",
    {
      packageCtaText: "Book a demo",
      allowed: projectCeiling("CTA", "CHECKLIST", "IMAGE"),
    },
  );
  assert.equal(r.decisions[0]?.rule, "allowed");
  assert.equal(r.decisions[0]?.final_type, "CTA");
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

check("12 CTA with invented discount downgrades", () => {
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "CTA",
        payload: { headline: "50% off today only", button_label: "Claim" },
      },
    ],
    "Limited offer.",
    {
      packageCtaText: "Book a demo",
      allowed: projectCeiling("CTA", "IMAGE"),
    },
  );
  assert.equal(r.decisions[0]?.rule, "cta_unsupported_claim");
});

check("13 project override excludes eligible type", () => {
  const proof = buildProofIndex(
    knowledgeWithProof(["40% faster support replies."]),
  );
  const allowedOverride = deriveAllowedSceneTypes({
    knowledge: {
      presentation: { allowed_scene_types: ["IMAGE", "CTA"] },
    },
    proof,
    projectSignals: saasSignals,
  });
  assert.ok(!allowedOverride.includes("STATISTIC"));
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "STATISTIC",
        payload: { value: "40%", label: "faster support replies" },
      },
    ],
    "Support replies faster.",
    { proof, allowed: allowedOverride, signals: saasSignals },
  );
  assert.equal(r.decisions[0]?.rule, "statistic_not_permitted");
});

check("14 missing override uses derived ceiling", () => {
  const proof = buildProofIndex(
    knowledgeWithProof(["40% growth year over year."]),
  );
  const derived = deriveAllowedSceneTypes(
    { knowledge: {}, proof, projectSignals: saasSignals },
    { sceneTypesEnabled: true },
  );
  assert.ok(derived.includes("STATISTIC"));
  assert.ok(derived.includes("IMAGE"));
});

check("15 IMAGE cannot be disabled in override", () => {
  const types = ensureImageInAllowed(["CTA", "CHECKLIST"]);
  assert.ok(types.includes("IMAGE"));
});

check("16 analyzer never upgrades IMAGE", () => {
  const before = imageScene("scene-1", "Still");
  const r = analyze([before], "Narration.");
  assert.equal(r.scenes[0]?.type, "IMAGE");
  assert.equal(r.decisions[0]?.requested_type, "IMAGE");
  assert.equal(r.decisions[0]?.final_type, "IMAGE");
});

check("17 downgraded scene compiles to valid IMAGE plan item", () => {
  const r = analyze(
    [
      {
        id: "scene-1",
        type: "STATISTIC",
        payload: { value: "99%", label: "fake" },
        narration_hint: "Busy workday with repeating questions.",
      },
    ],
    "Busy workday with repeating questions.",
  );
  assert.equal(r.scenes[0]?.type, "IMAGE");
  assert.ok(isImageScenePayload(r.scenes[0]!.payload));
  assert.ok(visualSceneToPlanItem(r.scenes[0]!));
});

check("18 identical input produces identical decisions", () => {
  const input = {
    scenes: [imageScene("scene-1", "A"), imageScene("scene-2", "B")],
    vo: "Line one. Line two.",
  };
  const a = analyze(input.scenes, input.vo);
  const b = analyze(input.scenes, input.vo);
  assert.deepEqual(a.decisions, b.decisions);
});

check("restaurant project ceiling excludes PHONE without override", () => {
  const types = deriveAllowedSceneTypes(
    {
      knowledge: {},
      proof: emptyProof,
      projectSignals: localServiceSignals,
    },
    { sceneTypesEnabled: true },
  );
  assert.ok(!types.includes("PHONE"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
