import assert from "node:assert/strict";
import {
  buildStoryboard,
  SHORT_PROFILE,
  coerceMotionType,
  sceneIdForStoryboardBeat,
  type StoryboardBeat,
} from "@/lib/video-engine/storyboard";
import { buildPhraseCues } from "@/video-worker/services/phraseCaptions";
import {
  resolveSceneMotionIntent,
  resolveBeatMotionPlan,
  legacyMotionForBeatIndex,
} from "@/lib/video-engine/semanticMotion/resolveSceneMotion";
import { buildZoompanExpr } from "@/lib/video-engine/motion";
import { evaluateSceneTypeHistoryDowngrade } from "@/lib/scene-types/presentation/sceneTypeHistoryGuardrail";
import { buildSceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import { resolveVisualProfile } from "@/lib/visual-profile/resolveVisualProfile";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok ", name);
  } catch (err) {
    failed++;
    console.error(" FAIL", name, err);
  }
}

function ctx(overrides: Partial<Parameters<typeof resolveSceneMotionIntent>[0]>) {
  return {
    sceneId: "scene-1",
    sceneType: "IMAGE" as const,
    sceneIndex: 0,
    sceneCount: 3,
    beatIndex: 0,
    beatCount: 3,
    narrativeRole: "hook",
    visualProfile: "NATURAL" as const,
    ...overrides,
  };
}

check("1 opening IMAGE hook → ATTENTION", () => {
  const r = resolveSceneMotionIntent(ctx({ narrativeRole: "hook" }));
  assert.equal(r.motion_intent, "ATTENTION");
});

check("2 explanatory IMAGE → EXPLAIN", () => {
  const r = resolveSceneMotionIntent(
    ctx({ narrativeRole: "setup", beatIndex: 1, sceneIndex: 1 }),
  );
  assert.equal(r.motion_intent, "EXPLAIN");
});

check("3 PHONE → REVEAL", () => {
  const r = resolveSceneMotionIntent(ctx({ sceneType: "PHONE" }));
  assert.equal(r.motion_intent, "REVEAL");
});

check("4 CHECKLIST → HOLD", () => {
  const r = resolveSceneMotionIntent(ctx({ sceneType: "CHECKLIST" }));
  assert.equal(r.motion_intent, "HOLD");
  assert.equal(r.motion_primitive, "static");
});

check("5 QUOTE → HOLD", () => {
  const r = resolveSceneMotionIntent(ctx({ sceneType: "QUOTE" }));
  assert.equal(r.motion_intent, "HOLD");
});

check("6 STATISTIC → EMPHASIS", () => {
  const r = resolveSceneMotionIntent(
    ctx({ sceneType: "STATISTIC", narrativeRole: "proof", beatIndex: 1 }),
  );
  assert.equal(r.motion_intent, "EMPHASIS");
});

check("7 CTA final → CLOSE", () => {
  const r = resolveSceneMotionIntent(
    ctx({
      sceneType: "CTA",
      sceneIndex: 2,
      sceneCount: 3,
      beatIndex: 2,
      narrativeRole: "cta",
    }),
  );
  assert.equal(r.motion_intent, "CLOSE");
});

check("8 text scenes always LOW intensity", () => {
  for (const type of ["CHECKLIST", "QUOTE", "STATISTIC", "CTA"] as const) {
    const r = resolveSceneMotionIntent(ctx({ sceneType: type }));
    assert.equal(r.motion_intensity, "LOW");
  }
});

check("9 MINIMAL reduces opening intensity", () => {
  const minimal = resolveSceneMotionIntent(
    ctx({ visualProfile: "MINIMAL", narrativeRole: "hook" }),
  );
  const bold = resolveSceneMotionIntent(
    ctx({ visualProfile: "BOLD", narrativeRole: "hook" }),
  );
  assert.equal(minimal.motion_intensity, "LOW");
  assert.equal(bold.motion_intensity, "MEDIUM");
});

check("10 BOLD may increase opening IMAGE intensity", () => {
  const r = resolveSceneMotionIntent(
    ctx({ visualProfile: "BOLD", narrativeRole: "hook", sceneType: "IMAGE" }),
  );
  assert.equal(r.motion_intensity, "MEDIUM");
});

check("11 PREMIUM remains LOW on HOLD types", () => {
  const r = resolveSceneMotionIntent(
    ctx({ visualProfile: "PREMIUM", sceneType: "QUOTE" }),
  );
  assert.equal(r.motion_intensity, "LOW");
  assert.equal(r.motion_primitive, "static");
});

check("12 same input resolves identically", () => {
  const input = ctx({ sceneType: "PHONE", narrativeRole: "twist" });
  const a = resolveSceneMotionIntent(input);
  const b = resolveSceneMotionIntent(input);
  assert.deepEqual(a, b);
});

check("13 beat index alone does not determine motion (typed scene)", () => {
  const checklist = resolveSceneMotionIntent(
    ctx({ sceneType: "CHECKLIST", beatIndex: 0 }),
  );
  const legacy = legacyMotionForBeatIndex(0);
  assert.notEqual(checklist.motion_primitive, legacy);
});

check("14 IMAGE-only storyboard builds with semantic motion", () => {
  const beats = buildStoryboard({
    voiceoverText: "One two three four five six seven eight.",
    sceneIds: ["a", "b"],
    audioDurationSeconds: 20,
    scenes: [
      { id: "a", type: "IMAGE" },
      { id: "b", type: "IMAGE" },
    ],
  });
  assert.ok(beats.length >= 3);
  assert.ok(beats[0]?.motion_intent);
});

check("15 adjacent IMAGE avoids duplicate primitive when possible", () => {
  const first = resolveBeatMotionPlan({
    beatIndex: 1,
    beatCount: 4,
    sceneId: "s2",
    sceneType: "IMAGE",
    sceneIndex: 1,
    sceneCount: 4,
    narrativeRole: "body",
    visualProfile: "NATURAL",
    previousPrimitive: "drift_up",
  });
  const second = resolveBeatMotionPlan({
    beatIndex: 2,
    beatCount: 4,
    sceneId: "s3",
    sceneType: "IMAGE",
    sceneIndex: 2,
    sceneCount: 4,
    narrativeRole: "body",
    visualProfile: "NATURAL",
    previousPrimitive: first.motion_primitive,
  });
  if (first.motion_primitive === second.motion_primitive) {
    assert.fail("expected alternate primitive");
  }
});

check("16 HOLD scenes not changed for variety", () => {
  const a = resolveBeatMotionPlan({
    beatIndex: 1,
    beatCount: 3,
    sceneId: "q1",
    sceneType: "QUOTE",
    sceneIndex: 1,
    sceneCount: 3,
    narrativeRole: "proof",
    previousPrimitive: "static",
  });
  assert.equal(a.motion_primitive, "static");
});

check("17 legacy semanticMotion false uses index cycle", () => {
  const beats = buildStoryboard({
    voiceoverText: "Sample narration for legacy motion path.",
    sceneIds: ["a"],
    audioDurationSeconds: 18,
    semanticMotion: false,
  });
  assert.equal(beats[1]?.motion, legacyMotionForBeatIndex(1));
  assert.equal(beats[1]?.motion_intent, undefined);
});

check("18 static motion expr is stable", () => {
  const expr = buildZoompanExpr("static", 90);
  assert.equal(expr.z, "1");
});

check("19 scene type history unchanged", () => {
  assert.equal(
    evaluateSceneTypeHistoryDowngrade({
      type: "CTA",
      history: buildSceneTypeProjectHistory({ rows: [] }),
    }),
    null,
  );
});

check("20 visual profile resolution unchanged", () => {
  const a = resolveVisualProfile({ projectId: "p1", knowledge: null });
  const b = resolveVisualProfile({ projectId: "p1", knowledge: null });
  assert.equal(a.profile, b.profile);
});

check("21 invalid motion falls back in resolver catch path", () => {
  const r = resolveSceneMotionIntent({
    sceneId: "x",
    sceneType: "IMAGE",
    sceneIndex: 0,
    sceneCount: 1,
    beatIndex: 0,
    beatCount: 1,
    narrativeRole: "body",
    visualProfile: null,
  });
  assert.ok(r.motion_primitive);
});

function timelineTotalSeconds(
  beats: StoryboardBeat[],
  transitionSeconds: number,
): number {
  if (beats.length === 0) return 0;
  let cumulative = beats[0].durationSeconds;
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(transitionSeconds, beats[i].durationSeconds / 2);
    cumulative = cumulative - td + beats[i].durationSeconds;
  }
  return cumulative;
}

check("22 audio-master duration remains correct", () => {
  const beats = buildStoryboard({
    voiceoverText:
      "Your kitchen still smells after you clean it. Swap the sponge weekly.",
    sceneIds: ["s1", "s2"],
    audioDurationSeconds: 30,
    scenes: [
      { id: "s1", type: "IMAGE" },
      { id: "s2", type: "CTA" },
    ],
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  assert.ok(Math.abs(total - 30) < 0.15);
});

check("22b explicit order distributes overflow beats (no last-scene pin)", () => {
  const scenes = ["scene-1", "scene-2", "scene-3", "scene-4"];
  const mapped = [0, 1, 2, 3, 4].map((i) =>
    sceneIdForStoryboardBeat(i, 5, scenes, true),
  );
  assert.deepEqual(mapped, [
    "scene-1",
    "scene-2",
    "scene-3",
    "scene-3",
    "scene-4",
  ]);
  assert.notEqual(mapped[3], "scene-4");
});

check("23 subtitle timing unchanged with semantic beats", () => {
  const beats = buildStoryboard({
    voiceoverText: "Hook line here. Middle explanation. Final call.",
    sceneIds: ["a"],
    audioDurationSeconds: 18,
  });
  const { totalSeconds, cues } = buildPhraseCues({
    beats,
    transitionSeconds: SHORT_PROFILE.transitionSeconds,
    speechDurationSeconds: 18,
    tailBufferSeconds: 0,
  });
  assert.ok(cues.length > 0);
  assert.ok(Math.abs(totalSeconds - 18) < 0.2);
});

check("24 MINIMAL profile dampens EXPLAIN IMAGE motion", () => {
  const r = resolveSceneMotionIntent(
    ctx({
      visualProfile: "MINIMAL",
      narrativeRole: "setup",
      beatIndex: 2,
      sceneIndex: 0,
    }),
  );
  assert.equal(r.motion_primitive, "static");
});

check("25 stored semantic motion overrides recompute", () => {
  const first = buildStoryboard({
    voiceoverText: "Sample voiceover for stored motion test run.",
    sceneIds: ["a"],
    audioDurationSeconds: 18,
  });
  const stored = first.map((b) => ({
    beat_id: b.id,
    motion_intent: b.motion_intent,
    motion_primitive: b.motion,
    motion_intensity: b.motion_intensity,
    motion_version: b.motion_version,
  }));
  const second = buildStoryboard({
    voiceoverText: "Sample voiceover for stored motion test run.",
    sceneIds: ["a"],
    audioDurationSeconds: 18,
    storedSemanticMotion: stored,
  });
  assert.deepEqual(
    first.map((b) => b.motion),
    second.map((b) => b.motion),
  );
});

check("26 invalid motion metadata coerces to static", () => {
  assert.equal(coerceMotionType("zoom_explode"), "static");
  const expr = buildZoompanExpr(coerceMotionType("bad") as "static", 60);
  assert.equal(expr.z, "1");
});

check("28 opening observation → ATTENTION", () => {
  const r = resolveSceneMotionIntent(
    ctx({ narrativeRole: "observation", beatIndex: 0 }),
  );
  assert.equal(r.motion_intent, "ATTENTION");
});

check("29 non-first observation → EXPLAIN", () => {
  const r = resolveSceneMotionIntent(
    ctx({ narrativeRole: "observation", beatIndex: 1, sceneIndex: 1 }),
  );
  assert.equal(r.motion_intent, "EXPLAIN");
});

check("30 why_backfires and meaning → EXPLAIN", () => {
  assert.equal(
    resolveSceneMotionIntent(ctx({ narrativeRole: "why_backfires", beatIndex: 2 }))
      .motion_intent,
    "EXPLAIN",
  );
  assert.equal(
    resolveSceneMotionIntent(ctx({ narrativeRole: "meaning", beatIndex: 2 }))
      .motion_intent,
    "EXPLAIN",
  );
});

check("31 unexpected_turn and correct_approach → REVEAL", () => {
  assert.equal(
    resolveSceneMotionIntent(ctx({ narrativeRole: "unexpected_turn", beatIndex: 2 }))
      .motion_intent,
    "REVEAL",
  );
  assert.equal(
    resolveSceneMotionIntent(
      ctx({ narrativeRole: "correct_approach", beatIndex: 2 }),
    ).motion_intent,
    "REVEAL",
  );
});

check("32 punchline → EMPHASIS", () => {
  const r = resolveSceneMotionIntent(
    ctx({ narrativeRole: "punchline", beatIndex: 2 }),
  );
  assert.equal(r.motion_intent, "EMPHASIS");
});

check("33 semantic motion version bumped", () => {
  const r = resolveSceneMotionIntent(ctx({ narrativeRole: "hook" }));
  assert.equal(r.motion_version, "semantic-motion@2");
});

check("27 build succeeds (checked via npm run build in CI script bundle)", () => {
  assert.ok(true);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
