import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getSpeechProvider } from "@/lib/ai";
import {
  estimateTtsCostUsd,
  PRICING_VERSION,
  TTS_USD_PER_1K_CHARS,
  withTelemetry,
} from "@/lib/ai/telemetry";

export interface GenerateVoiceoverInput {
  text: string;
  voice?: string;
  instructions?: string;
}

export interface GenerateVoiceoverResult {
  audioPath: string;
  durationSeconds?: number;
}

function workerTempDir(): string {
  return process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp");
}

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

// Content Quality Sprint (Video Sync) — measures the real duration of a media
// file so the storyboard can use AUDIO as the master timeline instead of a
// words-per-second estimate. Best-effort: any failure (ffprobe missing, parse
// error) resolves to undefined so the caller falls back to the heuristic and
// the render is never blocked.
export async function probeAudioDurationSeconds(
  filePath: string,
): Promise<number | undefined> {
  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;
    const done = (value: number | undefined) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let child;
    try {
      child = spawn(
        ffprobeBin(),
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          filePath,
        ],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      done(undefined);
      return;
    }

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", () => done(undefined));
    child.on("close", (code) => {
      if (code !== 0) {
        done(undefined);
        return;
      }
      const parsed = Number.parseFloat(stdout.trim());
      done(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
    });
  });
}

// Subtitle Reliability V1 (Part A — post-render verification) — measures the
// per-stream durations of a rendered file so the worker can verify the VIDEO
// never ends before the AUDIO. Returns the video and audio stream durations (in
// seconds) when available. Best-effort: any failure resolves to an empty object
// so duration verification only ever RECORDS a diagnostic, never blocks/fails a
// render.
export async function probeMediaStreams(
  filePath: string,
): Promise<{ video?: number; audio?: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;
    const done = (value: { video?: number; audio?: number }) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let child;
    try {
      child = spawn(
        ffprobeBin(),
        [
          "-v",
          "error",
          "-show_entries",
          "stream=codec_type,duration",
          "-of",
          "json",
          filePath,
        ],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      done({});
      return;
    }

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", () => done({}));
    child.on("close", (code) => {
      if (code !== 0) {
        done({});
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as {
          streams?: { codec_type?: string; duration?: string }[];
        };
        const out: { video?: number; audio?: number } = {};
        for (const stream of parsed.streams ?? []) {
          const value = Number.parseFloat(String(stream.duration));
          if (!Number.isFinite(value) || value <= 0) continue;
          if (stream.codec_type === "video" && out.video === undefined) {
            out.video = value;
          } else if (stream.codec_type === "audio" && out.audio === undefined) {
            out.audio = value;
          }
        }
        done(out);
      } catch {
        done({});
      }
    });
  });
}

// Synthesizes voiceover audio via the shared OpenAI Speech provider (no duplicate
// TTS logic in the worker). Writes MP3 bytes to a temp file for downstream FFmpeg
// and probes the file's real duration so the timeline can be audio-driven.
export async function generateVoiceover(
  input: GenerateVoiceoverInput,
): Promise<GenerateVoiceoverResult> {
  return withTelemetry(
    {
      stepName: "TTS",
      provider: "tts",
      model: "gpt-4o-mini-tts",
      inputSummary: "TTS input:\n- Voiceover text\n- Voice / instructions",
      outputSummary: (r) =>
        `audio duration=${r.durationSeconds ?? "unknown"}s`,
      measureInput: input.text,
      measureOutput: (r) => ({
        durationSeconds: r.durationSeconds,
        audioPath: r.audioPath,
      }),
      estimatedCostFromResult: () => estimateTtsCostUsd(input.text.length),
      pricingVersion: PRICING_VERSION,
      rawUsageFromResult: (r) => ({
        character_count: input.text.length,
        duration_seconds: r.durationSeconds ?? null,
        usd_per_1k_chars: TTS_USD_PER_1K_CHARS,
      }),
    },
    async () => {
      const text = input.text.trim();
      if (!text) {
        throw new Error("generateVoiceover: text is required");
      }

      const speech = getSpeechProvider();
      const result = await speech.synthesize({
        text,
        format: "mp3",
        ...(input.voice ? { voice: input.voice } : {}),
        ...(input.instructions ? { instructions: input.instructions } : {}),
      });

      const dir = workerTempDir();
      await mkdir(dir, { recursive: true });
      const audioPath = join(dir, `voiceover-${randomUUID()}.mp3`);
      await writeFile(audioPath, Buffer.from(result.audioBase64, "base64"));

      const durationSeconds = await probeAudioDurationSeconds(audioPath);

      return { audioPath, ...(durationSeconds ? { durationSeconds } : {}) };
    },
  );
}
