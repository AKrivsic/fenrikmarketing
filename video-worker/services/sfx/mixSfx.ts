import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  clampSfxGain,
  writeProgrammaticSfxWav,
} from "@/video-worker/services/sfx/programmaticSfx";
import type { SfxCategory } from "@/lib/attention/types";

const SFX_CATEGORIES = new Set<string>([
  "impact",
  "click",
  "notification",
  "swipe",
  "paper_rip",
  "glass_clink",
  "typing_stop",
  "error_tone",
  "whoosh",
  "comedic_pop",
  "silence_drop",
  "door_close",
  "cash_accent",
]);

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function runFfmpeg(args: string[], timeoutMs = 60_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`ffmpeg sfx mix timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 8192) stderr = stderr.slice(-8192);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg sfx mix failed (${code}): ${stderr.trim()}`));
    });
  });
}

export interface SfxOverlayPlan {
  selected: boolean;
  category: SfxCategory | null;
  timingMs: number;
  gain: number;
  reason: string | null;
  source: string | null;
}

export function parseSfxOverlayFromJobInput(
  input: Record<string, unknown>,
): SfxOverlayPlan {
  if (input["sfx_selected"] !== true) {
    return {
      selected: false,
      category: null,
      timingMs: 0,
      gain: 0,
      reason: typeof input["sfx_reason"] === "string" ? input["sfx_reason"] : null,
      source: typeof input["sfx_source"] === "string" ? input["sfx_source"] : null,
    };
  }
  const categoryRaw =
    typeof input["sfx_category"] === "string" ? input["sfx_category"].trim() : "";
  if (!SFX_CATEGORIES.has(categoryRaw)) {
    return {
      selected: false,
      category: null,
      timingMs: 0,
      gain: 0,
      reason: "omitted_unknown_category",
      source: "omitted_no_fit",
    };
  }
  const timingRaw = input["sfx_timing_ms"];
  const timingMs =
    typeof timingRaw === "number" && Number.isFinite(timingRaw)
      ? Math.max(0, Math.min(2500, Math.round(timingRaw)))
      : 400;
  return {
    selected: true,
    category: categoryRaw as SfxCategory,
    timingMs,
    gain: clampSfxGain(input["sfx_gain"]),
    reason: typeof input["sfx_reason"] === "string" ? input["sfx_reason"] : null,
    source: typeof input["sfx_source"] === "string" ? input["sfx_source"] : null,
  };
}

/**
 * Mix a single short programmatic SFX under the voice track.
 * Voice stays primary (sfx gain capped). Returns original path when omitted.
 */
export async function maybeMixVoiceWithSfx(args: {
  voicePath: string;
  workDir: string;
  plan: SfxOverlayPlan;
}): Promise<{ audioPath: string; mixed: boolean; debug: Record<string, unknown> }> {
  if (!args.plan.selected || !args.plan.category) {
    return {
      audioPath: args.voicePath,
      mixed: false,
      debug: { sfx_mixed: false, sfx_reason: args.plan.reason ?? "not_selected" },
    };
  }

  // silence_drop is intentional absence — do not inject audio.
  if (args.plan.category === "silence_drop") {
    return {
      audioPath: args.voicePath,
      mixed: false,
      debug: {
        sfx_mixed: false,
        sfx_category: "silence_drop",
        sfx_reason: args.plan.reason,
      },
    };
  }

  const sfxPath = join(args.workDir, `sfx-${args.plan.category}.wav`);
  const outPath = join(args.workDir, "voiceover-with-sfx.m4a");
  const written = await writeProgrammaticSfxWav({
    category: args.plan.category,
    outputPath: sfxPath,
  });

  const delayMs = args.plan.timingMs;
  const gain = args.plan.gain;
  // adelay + volume on SFX; amix with voice prioritized via weights.
  const filter =
    `[1:a]adelay=${delayMs}|${delayMs},volume=${gain.toFixed(3)}[sfx];` +
    `[0:a][sfx]amix=inputs=2:duration=first:dropout_transition=0:weights=1|${gain.toFixed(3)}[aout]`;

  await runFfmpeg([
    "-y",
    "-i",
    args.voicePath,
    "-i",
    written.path,
    "-filter_complex",
    filter,
    "-map",
    "[aout]",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outPath,
  ]);

  return {
    audioPath: outPath,
    mixed: true,
    debug: {
      sfx_mixed: true,
      sfx_category: args.plan.category,
      sfx_timing_ms: delayMs,
      sfx_gain: gain,
      sfx_reason: args.plan.reason,
      sfx_source: args.plan.source ?? "programmatic_v1",
      sfx_duration_ms: written.durationMs,
    },
  };
}
