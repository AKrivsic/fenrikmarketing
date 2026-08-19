/**
 * Step 5D — T2V delivery export 1080×1920 (Runway source stays 720×1280).
 * Run: npx tsx scripts/check-production-text-to-video-step-5d.ts
 */
import assert from "node:assert/strict";
import { execSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  TEXT_TO_VIDEO_DELIVERY_PROFILE,
  TEXT_TO_VIDEO_RUNWAY_RATIO,
  TEXT_TO_VIDEO_SOURCE_CLIP_PROFILE,
} from "../lib/text-to-video/runwayProductionConfig";
import {
  TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
} from "../lib/text-to-video/textToVideoAssemblyConstants";
import { computeTextToVideoAssemblyFingerprint } from "../lib/text-to-video/textToVideoAssemblyFingerprint";
import { readDurableTextToVideoAssemblyCheckpoint } from "../lib/text-to-video/textToVideoAssemblyCheckpoint";
import { validateTextToVideoFinalMp4 } from "../lib/text-to-video/textToVideoFinalArtifactValidation";
import { VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY } from "../lib/text-to-video/runTextToVideoAssemblyPhase";
import {
  buildMultiVideoClipArgs,
  buildVideoClipNormalizeChain,
  renderVideoClipsMp4,
} from "../video-worker/services/ffmpegVideoClips";
import { buildSubtitleBurnArgs } from "../video-worker/services/ffmpeg";
import type { VideoClipScene } from "../lib/video-engine/videoClipScene";

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function ffprobeJson(filePath: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const child = spawn(
      process.env.FFPROBE_PATH ?? "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,width,height",
        "-of",
        "json",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error("ffprobe_failed"));
      else resolve(JSON.parse(stdout) as Record<string, unknown>);
    });
  });
}

async function makePortraitClip(
  w: number,
  h: number,
  seconds: number,
  color = "0x00FF00",
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "t2v-5d-"));
  const out = join(dir, "clip.mp4");
  execSync(
    `${ffmpegBin()} -y -f lavfi -i color=c=${color}:s=${w}x${h}:d=${seconds} -c:v libx264 -pix_fmt yuv420p "${out}"`,
    { stdio: "ignore" },
  );
  return out;
}

async function makeVoiceWav(seconds: number, dir: string): Promise<string> {
  const out = join(dir, "vo.wav");
  execSync(
    `${ffmpegBin()} -y -f lavfi -i sine=frequency=440:duration=${seconds} "${out}"`,
    { stdio: "ignore" },
  );
  return out;
}

async function cropdetectFullFrame(mp4Path: string): Promise<boolean> {
  return new Promise((resolve) => {
    let stderr = "";
    const child = spawn(
      ffmpegBin(),
      [
        "-v",
        "info",
        "-i",
        mp4Path,
        "-vf",
        "cropdetect=24:16:0",
        "-frames:v",
        "3",
        "-f",
        "null",
        "-",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("close", () => {
      const m = stderr.match(/crop=(\d+):(\d+):(\d+):(\d+)/g);
      if (!m?.length) {
        resolve(true);
        return;
      }
      const last = m[m.length - 1]!;
      const parts = last.replace("crop=", "").split(":").map(Number);
      const [w, h, x, y] = parts;
      const dw = TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH;
      const dh = TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT;
      resolve(w >= dw - 8 && h >= dh - 8 && x <= 8 && y <= 8);
    });
    child.on("error", () => resolve(false));
  });
}

async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`ok — ${name}`);
}

async function main() {
  let n = 0;
  execSync(`${ffmpegBin()} -version`, { stdio: "ignore" });

  await check(`${++n} Runway ratio unchanged (720:1280)`, () => {
    assert.equal(TEXT_TO_VIDEO_RUNWAY_RATIO, "720:1280");
    assert.equal(TEXT_TO_VIDEO_SOURCE_CLIP_PROFILE.width, 720);
    assert.equal(TEXT_TO_VIDEO_SOURCE_CLIP_PROFILE.height, 1280);
  });

  await check(`${++n} source clip fixture is 720×1280`, async () => {
    const clipPath = await makePortraitClip(720, 1280, 2);
    const probed = await ffprobeJson(clipPath);
    const video = (
      probed.streams as { codec_type?: string; width?: number; height?: number }[]
    )?.find((s) => s.codec_type === "video");
    assert.equal(video?.width, 720);
    assert.equal(video?.height, 1280);
    await rm(join(clipPath, ".."), { recursive: true, force: true });
  });

  await check(`${++n} normalize chain scales to delivery 1080×1920 (9:16)`, () => {
    const { chain } = buildVideoClipNormalizeChain(
      0,
      3,
      3,
      TEXT_TO_VIDEO_DELIVERY_PROFILE.width,
      TEXT_TO_VIDEO_DELIVERY_PROFILE.height,
      30,
    );
    assert.match(chain, /scale=1080:1920/);
    assert.match(chain, /crop=1080:1920/);
    assert.doesNotMatch(chain, /pad=/);
  });

  await check(`${++n} FFmpeg reel 720p source → 1080×1920 delivery`, async () => {
    const work = await mkdtemp(join(tmpdir(), "t2v-deliver-"));
    const clip = await makePortraitClip(720, 1280, 3);
    const audio = await makeVoiceWav(3, work);
    const out = join(work, "out.mp4");
    const scenes: VideoClipScene[] = [
      {
        sceneId: "s0",
        clipPath: clip,
        durationSeconds: 3,
        transition: "none",
        sourceDurationSeconds: 3,
      },
    ];
    await renderVideoClipsMp4({
      scenes,
      audioPath: audio,
      outputPath: out,
      audioDurationSeconds: 3,
      profile: {
        width: TEXT_TO_VIDEO_DELIVERY_PROFILE.width,
        height: TEXT_TO_VIDEO_DELIVERY_PROFILE.height,
        fps: TEXT_TO_VIDEO_DELIVERY_PROFILE.fps,
        transitionSeconds: TEXT_TO_VIDEO_DELIVERY_PROFILE.transitionSeconds,
      },
    });
    await validateTextToVideoFinalMp4({
      mp4Path: out,
      expectedDurationSeconds: 3,
      durationToleranceSeconds: 0.6,
    });
    const probed = await ffprobeJson(out);
    const video = (
      probed.streams as { codec_type?: string; width?: number; height?: number }[]
    )?.find((s) => s.codec_type === "video");
    assert.equal(video?.width, 1080);
    assert.equal(video?.height, 1920);
    const fullFrame = await cropdetectFullFrame(out);
    assert.ok(
      fullFrame,
      "cropdetect should not report letterbox padding smaller than delivery canvas",
    );
    await rm(work, { recursive: true, force: true });
    await rm(join(clip, ".."), { recursive: true, force: true });
  });

  await check(`${++n} subtitles burn args run after 1080p pass-1 graph`, () => {
    const scenes: VideoClipScene[] = [
      {
        sceneId: "s0",
        clipPath: "/tmp/x.mp4",
        durationSeconds: 2,
        transition: "none",
        sourceDurationSeconds: 2,
      },
    ];
    const args = buildMultiVideoClipArgs(
      {
        scenes,
        audioPath: "/tmp/a.wav",
        outputPath: "/tmp/out.mp4",
        profile: {
          width: 1080,
          height: 1920,
          fps: 30,
          transitionSeconds: 0.4,
        },
        targetDurationSeconds: 2,
      },
      scenes.map((s) => ({ ...s, sourceDurationSeconds: 2 })),
    );
    const filterIdx = args.indexOf("-filter_complex");
    const filter = args[filterIdx + 1] ?? "";
    assert.match(filter, /scale=1080:1920/);
    const burn = buildSubtitleBurnArgs("/tmp/inter.mp4", "/tmp/subs.srt", "/tmp/final.mp4", {
      fps: 30,
    });
    const vfIdx = burn.indexOf("-vf");
    const vf = vfIdx >= 0 ? burn[vfIdx + 1] : "";
    assert.match(String(vf), /subtitles=/);
    assert.equal(burn.includes("/tmp/inter.mp4"), true);
  });

  await check(`${++n} assembly fingerprint includes delivery contract v2`, () => {
    const fp = computeTextToVideoAssemblyFingerprint({
      executionFingerprint: "ef",
      voiceSynthesisFingerprint: "vf",
      measuredAudioDurationSeconds: 20,
      trimmedClipSha256Ordered: ["a"],
      soundPlan: {
        schema_version: 1,
        revision: 0,
        music: { mode: "none" },
        scene_sound: {},
      },
      audioAssetFingerprints: [],
      sfxPlacements: [],
      musicRef: null,
      subtitleFingerprint: "none",
      transitionPlanKey: "t",
    });
    assert.ok(fp.length > 16);
    assert.equal(TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION, 2);
  });

  await check(`${++n} legacy 720p assembly checkpoint rejected`, () => {
    const brief = {
      [VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY]: {
        phase: "assembly_complete",
        assembly_fingerprint: "af",
        execution_fingerprint: "ef",
        sound_plan_revision: 0,
        trimmed_clips_fingerprint: "tf",
        voice_fingerprint: "vf",
        subtitle_fingerprint: "sf",
        staging: {
          mp4: { bucket: "video-renders", path: "p.mp4" },
          thumbnail: { bucket: "video-renders", path: "t.png" },
        },
        estimate: true,
      },
    };
    assert.equal(readDurableTextToVideoAssemblyCheckpoint(brief), null);
  });

  await check(`${++n} valid 1080p assembly checkpoint accepted`, () => {
    const brief = {
      [VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY]: {
        phase: "assembly_complete",
        assembly_contract_version: TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION,
        delivery_width: TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
        delivery_height: TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
        assembly_fingerprint: "af",
        execution_fingerprint: "ef",
        sound_plan_revision: 0,
        trimmed_clips_fingerprint: "tf",
        voice_fingerprint: "vf",
        subtitle_fingerprint: "sf",
        staging: {
          mp4: { bucket: "video-renders", path: "p.mp4" },
          thumbnail: { bucket: "video-renders", path: "t.png" },
        },
        estimate: true,
      },
    };
    const cp = readDurableTextToVideoAssemblyCheckpoint(brief);
    assert.ok(cp);
    assert.equal(cp.delivery_width, 1080);
    assert.equal(cp.delivery_height, 1920);
  });

  console.log(`\nStep 5D checks passed: ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
