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
  | "drift_down";

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
// YouTube Shorts share one render). Faster pace via short beats; 20–45s total.
export const SHORT_PROFILE: VideoProfile = {
  id: "short",
  width: 1080,
  height: 1920,
  fps: 30,
  minDurationSeconds: 20,
  maxDurationSeconds: 45,
  minBeats: 8,
  maxBeats: 15,
  minBeatSeconds: 2,
  maxBeatSeconds: 5,
  transitionSeconds: 0.4,
};

// Spoken words per second used to estimate narration length (so the timeline
// roughly matches the voiceover without probing the audio file).
const WORDS_PER_SECOND = 2.6;

// Motion rotation so consecutive beats never share the same movement.
const MOTION_CYCLE: MotionType[] = [
  "zoom_in",
  "pan_right",
  "zoom_out",
  "drift_up",
  "pan_left",
  "drift_down",
];

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
  // Content Quality Sprint (Video Sync) — the REAL voiceover duration (seconds),
  // measured from the rendered TTS file. When provided it becomes the master
  // timeline: beat durations are derived so the on-screen beats + subtitles sum
  // to exactly this length, instead of the WORDS_PER_SECOND estimate. Omitted
  // (undefined) keeps the legacy estimate so the builder stays backward
  // compatible when no audio measurement is available.
  audioDurationSeconds?: number;
  profile?: VideoProfile;
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
function transitionFor(index: number): TransitionType {
  if (index === 0) return "none";
  if (index % 5 === 0) return "push";
  if (index % 3 === 0) return "slide";
  return "fade";
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
  // narration is not cut short. With a measured audio duration we do NOT clamp
  // perBeat to the profile's beat range: clamping would make the beat sum
  // diverge from the audio and re-introduce the very drift this fix removes.
  const overlap = (numBeats - 1) * profile.transitionSeconds;
  const rawPerBeat = (targetTotal + overlap) / numBeats;
  const perBeat = hasAudio
    ? rawPerBeat
    : clamp(rawPerBeat, profile.minBeatSeconds, profile.maxBeatSeconds);

  const sentences = splitSentences(input.voiceoverText);
  const segments = toSegments(sentences, numBeats);
  const roles = buildRoles(numBeats, input.modeBeats);

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
  for (let i = 0; i < numBeats; i++) {
    beats.push({
      id: `beat-${i + 1}`,
      sceneId: sceneIds[i % sceneIds.length],
      role: roles[i],
      // Hook always opens punchy with a zoom-in; the rest rotate.
      motion: i === 0 ? "zoom_in" : MOTION_CYCLE[i % MOTION_CYCLE.length],
      transition: transitionFor(i),
      text: segments[i] ?? "",
      durationSeconds: Math.round(perBeat * 100) / 100,
    });
  }
  return beats;
}
