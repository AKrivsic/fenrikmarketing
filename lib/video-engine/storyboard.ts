import { isFramedProductVideoUsage } from "@/lib/assets/preferredVideoUsage";
import { productUiRequiresStaticMotion } from "@/lib/assets/productUiGuards";
import {
  narrativeBeatRolesForCount,
  planBeatDurations,
} from "@/lib/narrative-beats";
import type {
  MotionIntensity,
  MotionIntent,
} from "@/lib/video-engine/semanticMotion/motionIntent";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import {
  resolveBeatMotionPlan,
} from "@/lib/video-engine/semanticMotion/resolveSceneMotion";
import { effectiveSceneType, type SceneType } from "@/lib/scene-types/sceneType";

// Video Quality V2 — Storyboard builder.
//
// Turns a content package's narration + a small pool of stills into a richer
// TIMELINE of short "beats" (8–15 of them, 2–5s each). Each beat carries a
// motion and a light transition so the renderer can produce a moving video
// instead of "4 static images with a voice".
//
// Attention First V1 — the beat ROLE arc is driven by the CREATIVE MODE
// (storyboard.role labels mirror the mode's narrativeBeats, e.g. Story:
// setup/conflict/twist/resolution/cta), NOT a hardcoded marketing arc
// (hook/problem/scenario/proof/cta). The mode beats are passed in via
// BuildStoryboardInput.modeBeats; when absent the arc is a neutral
// hook -> body... -> cta with no marketing template baked in.
//
// Cost stays flat: beats REUSE the existing still pool (cycling through it with
// different motion), so a few generated images become many distinct-feeling
// beats. No AI provider is involved here — this is deterministic.

// A beat's structural role. The first beat is the hook/opening, the last is the
// CTA, and the middle carries the active mode beats (or "body" when unknown).
// Kept as a plain string so any creative mode's beat labels are accepted; it is
// metadata only (it does not change motion/transition/render).
export type BeatRole = string;

export type MotionType =
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "drift_up"
  | "drift_down"
  | "static";

// Light, non-gimmicky transitions only (Task 3).
export type TransitionType = "fade" | "slide" | "push" | "none";

export interface StoryboardBeat {
  id: string;
  // The still (scene) this beat shows. References a Scene.id from the pool.
  sceneId: string;
  role: BeatRole;
  motion: MotionType;
  // Transition INTO this beat from the previous one. The first beat is "none".
  transition: TransitionType;
  // Subtitle/narration segment shown during this beat.
  text: string;
  durationSeconds: number;
  motion_intent?: MotionIntent;
  motion_intensity?: MotionIntensity;
  motion_version?: string;
}

export interface VideoProfile {
  id: "short";
  width: number;
  height: number;
  fps: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  minBeats: number;
  maxBeats: number;
  minBeatSeconds: number;
  maxBeatSeconds: number;
  transitionSeconds: number;
}

// Task 7 — the single supported profile: vertical short (TikTok / IG Reels /
// YouTube Shorts share one render).
//
// Content Quality Sprint 2 — HARD video length target is 15–25s (tightened from
// the old 20–45s). The narration word budget (40–70 words, hard cap 80; see
// lib/ai/guardrails) is the primary lever that keeps the spoken track inside
// this window; the profile bounds the legacy words-per-second estimate and the
// beat count (adaptive 3–5 beats over 15–25s). A short, punchy format.
export const SHORT_PROFILE: VideoProfile = {
  id: "short",
  width: 1080,
  height: 1920,
  fps: 30,
  minDurationSeconds: 15,
  maxDurationSeconds: 25,
  minBeats: 3,
  maxBeats: 5,
  minBeatSeconds: 2,
  maxBeatSeconds: 5,
  transitionSeconds: 0.4,
};

// MVP scene/image cost cap. ONE video drives at most this many GENERATED scene
// stills, i.e. at most this many image-generation calls (1 video = ≤5 stills =
// ≤5 image gens). The storyboard cycles a small still pool across the 3–5
// timeline beats, so a handful of stills is enough for a 20–30s short. Reused
// asset stills cost nothing extra and are not bound by this cap. Shared by the
// content prompt, guardrails, workflow normalization and the video worker so
// the mental model and cost stay aligned in one place.
export const MAX_VIDEO_SCENE_STILLS = 5;

// Content Quality Sprint 2 — tail buffer. A short silent hold added AFTER the
// narration ends so the final beat (typically the CTA) and its subtitle stay on
// screen instead of cutting the instant the voice stops. Applied to the LAST
// beat's on-screen duration here, and mirrored by an audio `apad` of the same
// length in the renderer so `-shortest` keeps the hold instead of trimming it.
export const TAIL_BUFFER_SECONDS = 1.5;

// Spoken words per second used to estimate narration length (so the timeline
// roughly matches the voiceover without probing the audio file).
const WORDS_PER_SECOND = 2.6;

// Legacy rotation (fallback when semantic motion is disabled).
const MOTION_CYCLE: MotionType[] = [
  "zoom_in",
  "pan_right",
  "zoom_out",
  "drift_up",
  "pan_left",
  "drift_down",
];

export interface StoryboardSceneContext {
  id: string;
  type?: SceneType | string | null;
  video_usage?: string | null;
  asset_metadata?: unknown;
}

export function coerceMotionType(value: unknown): MotionType {
  if (typeof value !== "string") return "static";
  const v = value.trim() as MotionType;
  switch (v) {
    case "zoom_in":
    case "zoom_out":
    case "pan_left":
    case "pan_right":
    case "drift_up":
    case "drift_down":
    case "static":
      return v;
    default:
      return "static";
  }
}

export interface StoredSemanticMotionBeat {
  beat_id: string;
  motion_intent?: MotionIntent;
  motion_primitive?: MotionType;
  motion_intensity?: MotionIntensity;
  motion_version?: string;
}

export interface BuildStoryboardInput {
  voiceoverText: string;
  // Pool of still ids the beats cycle through (at least one).
  sceneIds: string[];
  // Strong opening line (Task 5). When present it seeds the hook beat.
  hook?: string | null;
  // Attention First V1 — the CREATIVE MODE's ordered narrative beats (e.g.
  // ["setup","conflict","twist","resolution","cta"]). When provided the beat
  // role arc follows the mode instead of a hardcoded marketing arc. Omitted
  // (undefined/empty) keeps a neutral hook -> body... -> cta arc.
  modeBeats?: string[];
  /**
   * Optional HOOK/SETUP/ESCALATION/RESOLUTION roles for duration weighting.
   * When omitted, roles are derived from modeBeats (or a neutral 4-beat spine).
   */
  narrativeBeatRoles?: string[];
  // Content Quality Sprint (Video Sync) — the REAL voiceover duration (seconds),
  // measured from the rendered TTS file. When provided it becomes the master
  // timeline: beat durations are derived so the on-screen beats + subtitles sum
  // to exactly this length, instead of the WORDS_PER_SECOND estimate. Omitted
  // (undefined) keeps the legacy estimate so the builder stays backward
  // compatible when no audio measurement is available.
  audioDurationSeconds?: number;
  // Content Quality Sprint 2 — extra silent hold (seconds) appended to the LAST
  // beat so the CTA / final subtitle lingers after the narration ends. Defaults
  // to 0 (no tail) so existing callers and the audio-master invariant are
  // unchanged; the worker passes TAIL_BUFFER_SECONDS.
  tailBufferSeconds?: number;
  /** When true, map beats across scene ids in plan order (no early cycling). */
  explicitSceneOrder?: boolean;
  profile?: VideoProfile;
  /** Scene types for semantic motion (explicit plan). */
  scenes?: StoryboardSceneContext[];
  visualProfile?: VisualProfile | null;
  /** When false, use legacy index-based motion (old jobs / tests). */
  semanticMotion?: boolean;
  /** Prior render semantic motion (retries / re-render stability). */
  storedSemanticMotion?: StoredSemanticMotionBeat[];
  /** Attention & Engagement v1 — opening motion intent from package plan. */
  openingAttentionMotionIntent?: MotionIntent | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Splits narration into sentence-ish segments. Falls back to the whole text as
// a single segment when there is no sentence punctuation.
function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [normalized];
}

// Regroups sentences into exactly `count` non-empty segments, merging adjacent
// sentences when there are more sentences than beats and splitting long ones
// when there are fewer.
function toSegments(sentences: string[], count: number): string[] {
  if (sentences.length === 0) return Array.from({ length: count }, () => "");
  if (sentences.length === count) return sentences;

  if (sentences.length > count) {
    // Merge: distribute sentences across `count` buckets as evenly as possible.
    const segments: string[] = Array.from({ length: count }, () => "");
    sentences.forEach((sentence, i) => {
      const bucket = Math.min(count - 1, Math.floor((i * count) / sentences.length));
      segments[bucket] = segments[bucket]
        ? `${segments[bucket]} ${sentence}`
        : sentence;
    });
    return segments;
  }

  // Fewer sentences than beats: split the longest sentences (by words) until we
  // reach `count` segments.
  const segments = [...sentences];
  while (segments.length < count) {
    let longestIdx = 0;
    let longestWords = 0;
    for (let i = 0; i < segments.length; i++) {
      const words = segments[i].split(" ").length;
      if (words > longestWords) {
        longestWords = words;
        longestIdx = i;
      }
    }
    const words = segments[longestIdx].split(" ");
    if (words.length < 2) break; // cannot split further
    const mid = Math.ceil(words.length / 2);
    const first = words.slice(0, mid).join(" ");
    const second = words.slice(mid).join(" ");
    segments.splice(longestIdx, 1, first, second);
  }
  return segments;
}

// Attention First V1 — builds the role arc from the CREATIVE MODE's beats.
//
// The mode beats (e.g. ["setup","conflict","twist","resolution","cta"]) are
// spread evenly across the `count` storyboard beats so the role labels mirror
// the story the narration actually tells. There is NO hardcoded marketing arc
// (problem/scenario/proof) anymore.
//
// When no mode beats are supplied we fall back to a NEUTRAL arc: first beat is
// the hook/opening, last is the CTA, and everything between is "body" — still no
// marketing template baked in.
function buildRoles(count: number, modeBeats?: string[]): BeatRole[] {
  if (count <= 0) return [];

  const beats = (modeBeats ?? [])
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  if (beats.length === 0) {
    const roles: BeatRole[] = Array.from({ length: count }, () => "body");
    roles[0] = "hook";
    if (count > 1) roles[count - 1] = "cta";
    return roles;
  }

  // Map each storyboard beat onto a mode beat, stretching/compressing the arc to
  // fit `count` so the order is always preserved (first mode beat first, last
  // mode beat — typically the CTA — last).
  return Array.from({ length: count }, (_unused, i) => {
    const idx =
      count === 1
        ? 0
        : Math.min(beats.length - 1, Math.floor((i * beats.length) / count));
    return beats[idx];
  });
}

// Light transition pattern: mostly fade, with an occasional slide/push for
// variety. Never gimmicky.
function transitionFor(index: number, motionIntent?: MotionIntent): TransitionType {
  if (index === 0) return "none";
  if (motionIntent === "HOLD" || motionIntent === "CLOSE") return "fade";
  if (index % 5 === 0) return "push";
  if (index % 3 === 0) return "slide";
  return "fade";
}

function assetMetadataForSceneId(
  sceneId: string,
  scenes: StoryboardSceneContext[],
): unknown {
  const row = scenes.find((s) => s.id === sceneId);
  return row?.asset_metadata;
}

function sceneIndexForId(
  sceneId: string,
  scenes: StoryboardSceneContext[],
): number {
  const idx = scenes.findIndex((s) => s.id === sceneId);
  return idx >= 0 ? idx : 0;
}

function videoUsageForSceneId(
  sceneId: string,
  scenes: StoryboardSceneContext[],
): string | null {
  const row = scenes.find((s) => s.id === sceneId);
  const raw = row?.video_usage;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function sceneTypeForId(
  sceneId: string,
  scenes: StoryboardSceneContext[],
): SceneType {
  const row = scenes.find((s) => s.id === sceneId);
  return effectiveSceneType(row?.type, "IMAGE");
}

export function sceneIdForStoryboardBeat(
  beatIndex: number,
  numBeats: number,
  sceneIds: string[],
  explicitSceneOrder: boolean,
): string {
  const n = sceneIds.length;
  if (n === 0) return "scene-1";
  if (!explicitSceneOrder) {
    return sceneIds[beatIndex % n] ?? sceneIds[0];
  }
  // Explicit order: distribute beats evenly across scenes. Never pin overflow
  // beats exclusively onto the last still (that created ~10s endings when
  // 5 beats mapped onto 4 scenes).
  if (numBeats <= 1 || n === 1) {
    return sceneIds[0] ?? "scene-1";
  }
  if (n === numBeats) {
    return sceneIds[Math.min(beatIndex, n - 1)] ?? sceneIds[0];
  }
  const idx = Math.round(
    (beatIndex * (n - 1)) / Math.max(1, numBeats - 1),
  );
  return sceneIds[Math.min(Math.max(0, idx), n - 1)] ?? sceneIds[0];
}

// Task 1 — deterministically builds the beat timeline.
export function buildStoryboard(input: BuildStoryboardInput): StoryboardBeat[] {
  const profile = input.profile ?? SHORT_PROFILE;
  const sceneIds =
    input.sceneIds.length > 0 ? input.sceneIds : ["scene-1"];

  // Audio-master timeline: when the real TTS duration is known, it IS the
  // target total (source of truth) — no words-per-second estimate, no
  // min/max duration clamp, so the timeline never under/overshoots the voice.
  // Otherwise fall back to the legacy words-per-second estimate (clamped).
  const hasAudio =
    typeof input.audioDurationSeconds === "number" &&
    Number.isFinite(input.audioDurationSeconds) &&
    input.audioDurationSeconds > 0;

  const wordCount = input.voiceoverText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSpeech = wordCount / WORDS_PER_SECOND;
  const targetTotal = hasAudio
    ? (input.audioDurationSeconds as number)
    : clamp(estimatedSpeech, profile.minDurationSeconds, profile.maxDurationSeconds);

  // Beat count: ~3s per beat on average, clamped to the profile range.
  const numBeats = clamp(
    Math.round(targetTotal / 3),
    profile.minBeats,
    profile.maxBeats,
  );

  // On-screen durations sum to targetTotal + overlap, because each transition
  // overlaps the previous beat by transitionSeconds (xfade), so the audible
  // narration is not cut short. Duration Planner: weight by narrative role +
  // voiceover segment length (Hook/Ending short, Setup/Escalation medium),
  // with a hard ≤35% cap unless the segment's word share justifies longer.
  const overlap = (numBeats - 1) * profile.transitionSeconds;
  const distributable = targetTotal + overlap;

  const sentences = splitSentences(input.voiceoverText);
  const segments = toSegments(sentences, numBeats);
  const roles = buildRoles(numBeats, input.modeBeats);
  const durationRoles =
    input.narrativeBeatRoles && input.narrativeBeatRoles.length === numBeats
      ? input.narrativeBeatRoles
      : input.narrativeBeatRoles && input.narrativeBeatRoles.length > 0
        ? Array.from({ length: numBeats }, (_u, i) => {
            const src = input.narrativeBeatRoles!;
            const idx =
              numBeats === 1
                ? 0
                : Math.min(
                    src.length - 1,
                    Math.floor((i * src.length) / numBeats),
                  );
            return src[idx]!;
          })
        : narrativeBeatRolesForCount(numBeats);
  const segmentWordCounts = segments.map(
    (s) => s.trim().split(/\s+/).filter(Boolean).length,
  );
  const planned = planBeatDurations({
    totalSeconds: distributable,
    roles: durationRoles,
    segmentWordCounts,
  });
  let beatDurations = planned.durations;
  if (!hasAudio) {
    beatDurations = beatDurations.map((d) =>
      clamp(d, profile.minBeatSeconds, profile.maxBeatSeconds),
    );
    const clampedSum = beatDurations.reduce((a, b) => a + b, 0) || 1;
    beatDurations = beatDurations.map(
      (d) => Math.round(((d / clampedSum) * distributable) * 100) / 100,
    );
  }

  // Task 5 — seed the hook beat with the strong opening line when provided and
  // it is not already what the narration starts with.
  const hook = input.hook?.trim();
  if (hook) {
    const firstSegment = (segments[0] ?? "").toLowerCase();
    if (!firstSegment.startsWith(hook.toLowerCase().slice(0, 20))) {
      segments[0] = hook;
    }
  }

  const beats: StoryboardBeat[] = [];
  const explicitOrder = input.explicitSceneOrder === true;
  const sceneContexts = input.scenes ?? sceneIds.map((id) => ({ id }));
  const useSemantic = input.semanticMotion !== false;
  const visualProfile = input.visualProfile ?? null;
  const storedMotionPlan =
    input.storedSemanticMotion &&
    input.storedSemanticMotion.length === numBeats
      ? input.storedSemanticMotion
      : undefined;
  let previousPrimitive: MotionType | null = null;

  for (let i = 0; i < numBeats; i++) {
    const sceneId = sceneIdForStoryboardBeat(
      i,
      numBeats,
      sceneIds,
      explicitOrder,
    );
    const role = roles[i] ?? "body";

    let motion: MotionType;
    let motion_intent: MotionIntent | undefined;
    let motion_intensity: MotionIntensity | undefined;
    let motion_version: string | undefined;

    if (useSemantic) {
      const beatVideoUsage = videoUsageForSceneId(sceneId, sceneContexts);
      const beatAssetMetadata = assetMetadataForSceneId(sceneId, sceneContexts);
      const plan = resolveBeatMotionPlan({
        beatIndex: i,
        beatCount: numBeats,
        sceneId,
        sceneType: sceneTypeForId(sceneId, sceneContexts),
        sceneIndex: sceneIndexForId(sceneId, sceneContexts),
        sceneCount: sceneContexts.length,
        narrativeRole: role,
        visualProfile,
        previousPrimitive,
        videoUsage: beatVideoUsage,
        assetMetadata: beatAssetMetadata,
        openingAttentionMotionIntent:
          i === 0 ? input.openingAttentionMotionIntent ?? null : null,
      });
      motion = plan.motion_primitive;
      motion_intent = plan.motion_intent;
      motion_intensity = plan.motion_intensity;
      motion_version = plan.motion_version;

      const beatId = `beat-${i + 1}`;
      const stored = storedMotionPlan?.find((b) => b.beat_id === beatId);
      if (stored?.motion_primitive) {
        motion = coerceMotionType(stored.motion_primitive);
        if (stored.motion_intent) motion_intent = stored.motion_intent;
        if (stored.motion_intensity) motion_intensity = stored.motion_intensity;
        if (stored.motion_version) motion_version = stored.motion_version;
      }

      if (
        isFramedProductVideoUsage(beatVideoUsage) ||
        productUiRequiresStaticMotion(beatAssetMetadata, beatVideoUsage)
      ) {
        motion = "static";
        motion_intent = "HOLD";
        motion_intensity = "LOW";
      }

      previousPrimitive = motion;
    } else {
      motion =
        i === 0 ? "zoom_in" : MOTION_CYCLE[i % MOTION_CYCLE.length] ?? "drift_up";
    }

    beats.push({
      id: `beat-${i + 1}`,
      sceneId,
      role,
      motion,
      transition: transitionFor(i, motion_intent),
      text: segments[i] ?? "",
      durationSeconds: beatDurations[i] ?? 3,
      ...(motion_intent ? { motion_intent } : {}),
      ...(motion_intensity ? { motion_intensity } : {}),
      ...(motion_version ? { motion_version } : {}),
    });
  }

  // Content Quality Sprint 2 — append the tail buffer to the LAST beat only, so
  // the narration beats stay in sync with the voice and the final beat simply
  // holds for the silent tail. The renderer pads the audio by the same amount
  // (apad) so `-shortest` keeps the hold rather than trimming it.
  const tail = input.tailBufferSeconds;
  if (
    typeof tail === "number" &&
    Number.isFinite(tail) &&
    tail > 0 &&
    beats.length > 0
  ) {
    const last = beats[beats.length - 1];
    last.durationSeconds = Math.round((last.durationSeconds + tail) * 100) / 100;
  }

  return beats;
}
