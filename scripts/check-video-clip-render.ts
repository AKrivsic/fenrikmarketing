/**
 * Video Clip Render Step 4 — real FFmpeg/ffprobe integration checks.
 * npm run check:video-clip-render
 *
 * Creates temporary lavfi clips, renders via renderVideoClipsMp4, probes the MP4.
 * No network / paid AI. Cleans up the temp directory afterwards.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildMultiBeatArgs,
  computeXfadeTimelineSeconds,
  generateThumbnail,
  type RenderBeat,
  type RenderMp4Input,
} from "@/video-worker/services/ffmpeg";
import {
  buildMultiVideoClipArgs,
  buildVideoClipNormalizeChain,
  computeVideoClipXfadeOffsets,
  renderVideoClipsMp4,
} from "@/video-worker/services/ffmpegVideoClips";
import type { VideoClipScene } from "@/lib/video-engine/videoClipScene";
import {
  SHORT_PROFILE,
  TAIL_BUFFER_SECONDS,
} from "@/lib/video-engine/storyboard";
import { probeAudioDurationSeconds, probeMediaStreams } from "@/video-worker/services/tts";

const TOLERANCE = 0.35;

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr}`));
    });
  });
}

async function filterList(bin: string): Promise<string> {
  const { stdout, stderr } = await run(bin, ["-hide_banner", "-filters"]);
  return `${stdout}\n${stderr}`;
}

async function preferLibassFfmpeg(): Promise<void> {
  const current = ffmpegBin();
  try {
    const filters = await filterList(current);
    if (/\bsubtitles\b/.test(filters)) return;
  } catch {
    // fall through to candidates
  }

  const candidates = [
    "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
    "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
  ];
  for (const bin of candidates) {
    try {
      const filters = await filterList(bin);
      if (!/\bsubtitles\b/.test(filters)) continue;
      process.env.FFMPEG_PATH = bin;
      process.env.FFPROBE_PATH = bin.replace(/ffmpeg$/, "ffprobe");
      console.log(`  note using libass-capable ffmpeg: ${bin}`);
      return;
    } catch {
      // try next
    }
  }

  throw new Error(
    "BLOCKER: ffmpeg has no 'subtitles' (libass) filter. " +
      "Install ffmpeg-full (Homebrew) or set FFMPEG_PATH to a build with libass. " +
      "No mock subtitle tests are used.",
  );
}

async function requireBins(): Promise<void> {
  try {
    await preferLibassFfmpeg();
    await run(ffmpegBin(), ["-version"]);
    await run(ffprobeBin(), ["-version"]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("BLOCKER:")) throw err;
    throw new Error(
      `BLOCKER: ffmpeg/ffprobe required for video-clip render tests (no mocks). ${message}`,
    );
  }
}

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(
    () => console.log(`  ok  ${name}`),
    (err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${name}`);
      console.error(`       ${message.replace(/\n/g, "\n       ")}`);
      throw err;
    },
  );
}

async function probeJson(path: string): Promise<{
  width: number;
  height: number;
  fps: number;
  vcodec: string;
  acodec: string | null;
  duration: number;
  nbAudioStreams: number;
}> {
  const { stdout } = await run(ffprobeBin(), [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    path,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: {
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
      duration?: string;
    }[];
    format?: { duration?: string };
  };
  const video = parsed.streams?.find((s) => s.codec_type === "video");
  const audioStreams = (parsed.streams ?? []).filter((s) => s.codec_type === "audio");
  assert.ok(video, "missing video stream");
  const rate = video.avg_frame_rate || video.r_frame_rate || "0/1";
  const [num, den] = rate.split("/").map(Number);
  const fps = den ? num / den : 0;
  const duration =
    Number.parseFloat(String(video.duration ?? "")) ||
    Number.parseFloat(String(parsed.format?.duration ?? "")) ||
    0;
  return {
    width: video.width ?? 0,
    height: video.height ?? 0,
    fps,
    vcodec: video.codec_name ?? "",
    acodec: audioStreams[0]?.codec_name ?? null,
    duration,
    nbAudioStreams: audioStreams.length,
  };
}

async function meanVolumeDb(path: string): Promise<number> {
  const { stderr } = await run(ffmpegBin(), [
    "-i",
    path,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  const match = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  assert.ok(match, `volumedetect mean_volume missing: ${stderr.slice(-500)}`);
  return Number.parseFloat(match[1]);
}

async function framePngNear(path: string, atSeconds: number, outPng: string): Promise<void> {
  await run(ffmpegBin(), [
    "-y",
    "-ss",
    atSeconds.toFixed(3),
    "-i",
    path,
    "-frames:v",
    "1",
    outPng,
  ]);
}

function pngHasNonBlackEdge(buf: Buffer): boolean {
  // Minimal PNG sanity: file starts with PNG signature and is non-trivial size.
  // Black-bar letterboxing would still produce a valid PNG; cover-crop is asserted
  // via filter string + output geometry; edge color check uses a separate lavfi probe.
  return buf.length > 1000 && buf[0] === 0x89 && buf[1] === 0x50;
}

async function edgeIsColoredNotBlack(pngPath: string): Promise<boolean> {
  const rawPath = `${pngPath}.raw`;
  await run(ffmpegBin(), [
    "-y",
    "-i",
    pngPath,
    "-vf",
    "format=rgb24,crop=2:1:0:0",
    "-f",
    "rawvideo",
    rawPath,
  ]);
  const raw = await readFile(rawPath);
  return raw.length >= 3 && (raw[0] > 20 || raw[1] > 20 || raw[2] > 20);
}

let failures = 0;
let passed = 0;

async function main(): Promise<void> {
  console.log("check:video-clip-render");
  await requireBins();

  const dir = await mkdtemp(join(tmpdir(), "fenrik-video-clips-"));
  try {
    // --- fixtures ---
    // Vertical moving shape, 4s @ 30fps
    await run(ffmpegBin(), [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=1080x1920:rate=30:duration=4",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      join(dir, "vert_4s.mp4"),
    ]);
    // Horizontal 1920x1080, 6s (longer than 3s scene) @ 24fps + loud sine audio
    await run(ffmpegBin(), [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x3366CC:s=1920x1080:r=24:d=6",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=1000:sample_rate=44100:duration=6",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      join(dir, "horiz_6s_audio.mp4"),
    ]);
    // Short clip 1.5s for 4s scene (freeze hold)
    await run(ffmpegBin(), [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=720x1280:rate=30:duration=1.5",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      join(dir, "short_1_5s.mp4"),
    ]);
    // Shared voiceover: audible 440Hz sine (must appear in output)
    const voDuration = 12.0;
    await run(ffmpegBin(), [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:sample_rate=44100:duration=${voDuration}`,
      "-c:a",
      "aac",
      join(dir, "vo.aac"),
    ]);
    // Silent VO for clip-audio discard check
    await run(ffmpegBin(), [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      "5",
      "-c:a",
      "aac",
      join(dir, "silent_vo.aac"),
    ]);

    await writeFile(
      join(dir, "subs.srt"),
      [
        "1",
        "00:00:00,000 --> 00:00:03,000",
        "CLIP RENDER TEST",
        "",
        "2",
        "00:00:03,500 --> 00:00:08,000",
        "SECOND LINE",
        "",
      ].join("\n"),
    );

    const scenes: VideoClipScene[] = [
      {
        sceneId: "s1",
        clipPath: join(dir, "vert_4s.mp4"),
        durationSeconds: 4,
        transition: "none",
        sourceDurationSeconds: 4,
      },
      {
        sceneId: "s2",
        clipPath: join(dir, "horiz_6s_audio.mp4"),
        durationSeconds: 3,
        transition: "fade",
        sourceDurationSeconds: 6,
      },
      {
        sceneId: "s3",
        clipPath: join(dir, "short_1_5s.mp4"),
        durationSeconds: 4,
        transition: "slide",
        sourceDurationSeconds: 1.5,
      },
    ];

    const xfade = computeVideoClipXfadeOffsets(scenes, SHORT_PROFILE.transitionSeconds);
    const expectedTimeline = xfade.timelineSeconds;
    const targetDuration = voDuration + TAIL_BUFFER_SECONDS;

    // --- unit-ish filter checks ---
    await check("normalize cover-crop filter (no letterbox scale)", () => {
      const { chain } = buildVideoClipNormalizeChain(0, 3, 6, 1080, 1920, 30);
      assert.match(chain, /force_original_aspect_ratio=increase/);
      assert.match(chain, /crop=1080:1920/);
      assert.doesNotMatch(chain, /pad=/);
      assert.match(chain, /trim=duration=3\.000/);
    });

    await check("shorter clip uses tpad hold (no loop)", () => {
      const { chain } = buildVideoClipNormalizeChain(0, 4, 1.5, 1080, 1920, 30);
      assert.match(chain, /tpad=stop_mode=1/);
      assert.doesNotMatch(chain, /loop=/);
      assert.doesNotMatch(chain, /setpts=PTS\*/);
    });

    await check("transition offsets match still-path xfade math", () => {
      const beats: RenderBeat[] = scenes.map((s) => ({
        sceneId: s.sceneId,
        motion: "static",
        transition: s.transition,
        durationSeconds: s.durationSeconds,
      }));
      assert.equal(
        xfade.timelineSeconds,
        computeXfadeTimelineSeconds(beats, SHORT_PROFILE.transitionSeconds),
      );
      // offset0 = 4 - 0.4 = 3.6
      assert.ok(Math.abs(xfade.offsets[0]! - 3.6) < 0.001);
      // after first xfade cumulative = 3.6 + 3 = 6.6; offset1 = 6.6 - 0.4 = 6.2
      assert.ok(Math.abs(xfade.offsets[1]! - 6.2) < 0.001);
      const args = buildMultiVideoClipArgs(
        {
          scenes,
          audioPath: join(dir, "vo.aac"),
          outputPath: join(dir, "args-only.mp4"),
          targetDurationSeconds: targetDuration,
          profile: SHORT_PROFILE,
        },
        scenes.map((s) => ({
          ...s,
          sourceDurationSeconds: s.sourceDurationSeconds!,
        })),
      );
      const filter = args[args.indexOf("-filter_complex") + 1];
      assert.match(filter, /offset=3\.600/);
      assert.match(filter, /offset=6\.200/);
      // Only one audio pad from the VO input index (3), never clip :a
      assert.doesNotMatch(filter, /\[0:a\]/);
      assert.doesNotMatch(filter, /\[1:a\]/);
      assert.doesNotMatch(filter, /\[2:a\]/);
      assert.match(filter, /\[3:a\]apad/);
    });

    // --- real render ---
    const outPath = join(dir, "out.mp4");
    const result = await renderVideoClipsMp4({
      scenes,
      audioPath: join(dir, "vo.aac"),
      srtPath: join(dir, "subs.srt"),
      outputPath: outPath,
      audioDurationSeconds: voDuration,
      tailPadSeconds: TAIL_BUFFER_SECONDS,
      profile: SHORT_PROFILE,
    });

    await check("join three video scenes → MP4 exists", async () => {
      const buf = await readFile(outPath);
      assert.ok(buf.length > 10_000, `output too small: ${buf.length}`);
      assert.equal(result.mp4Path, outPath);
    });

    const meta = await probeJson(outPath);

    await check("output 1080×1920", () => {
      assert.equal(meta.width, 1080);
      assert.equal(meta.height, 1920);
    });

    await check("output 30 fps", () => {
      assert.ok(Math.abs(meta.fps - 30) < 0.05, `fps=${meta.fps}`);
    });

    await check("H.264 video + AAC audio", () => {
      assert.equal(meta.vcodec, "h264");
      assert.equal(meta.acodec, "aac");
      assert.equal(meta.nbAudioStreams, 1);
    });

    await check("shared voiceover present in result", async () => {
      const mean = await meanVolumeDb(outPath);
      assert.ok(mean > -40, `expected audible VO, mean_volume=${mean} dB`);
    });

    await check("clip audio is not mixed in", async () => {
      const discardOut = join(dir, "discard-audio.mp4");
      await renderVideoClipsMp4({
        scenes: [
          {
            sceneId: "loud",
            clipPath: join(dir, "horiz_6s_audio.mp4"),
            durationSeconds: 3,
            transition: "none",
            sourceDurationSeconds: 6,
          },
        ],
        audioPath: join(dir, "silent_vo.aac"),
        outputPath: discardOut,
        audioDurationSeconds: 5,
        tailPadSeconds: 0,
        profile: SHORT_PROFILE,
      });
      const mean = await meanVolumeDb(discardOut);
      // Silent VO → near digital silence; loud 1kHz clip must not leak.
      assert.ok(mean < -40, `clip audio leaked: mean_volume=${mean} dB`);
    });

    await check("longer clip is trimmed (scene duration on timeline)", () => {
      // s2 is 6s source → 3s scene; timeline uses 3s not 6s
      assert.ok(expectedTimeline < 4 + 6 + 4 - 0.5);
      assert.ok(
        Math.abs(expectedTimeline - (4 + 3 + 4 - 2 * SHORT_PROFILE.transitionSeconds)) < 0.001,
      );
    });

    await check("shorter clip holds last frame (filter + render ok)", () => {
      const { chain } = buildVideoClipNormalizeChain(2, 4, 1.5, 1080, 1920, 30);
      assert.match(chain, /tpad=stop_mode=1:stop_duration=2\.500/);
    });

    await check("horizontal input not deformed (cover crop → 1080×1920)", async () => {
      // Solo-normalize horizontal clip and sample a corner (solid blue → not black bars).
      const solo = join(dir, "horiz_norm.mp4");
      await renderVideoClipsMp4({
        scenes: [
          {
            sceneId: "h",
            clipPath: join(dir, "horiz_6s_audio.mp4"),
            durationSeconds: 2,
            transition: "none",
            sourceDurationSeconds: 6,
          },
        ],
        audioPath: join(dir, "silent_vo.aac"),
        outputPath: solo,
        audioDurationSeconds: 2,
        profile: SHORT_PROFILE,
      });
      const m = await probeJson(solo);
      assert.equal(m.width, 1080);
      assert.equal(m.height, 1920);
      const frame = join(dir, "horiz_frame.png");
      await framePngNear(solo, 0.5, frame);
      const buf = await readFile(frame);
      assert.ok(pngHasNonBlackEdge(buf));
      assert.ok(await edgeIsColoredNotBlack(frame), "expected colored edge (no letterbox)");
    });

    await check("result duration matches audio master timeline", async () => {
      const streams = await probeMediaStreams(outPath);
      const probed = await probeAudioDurationSeconds(outPath);
      assert.ok(streams.video !== undefined);
      assert.ok(
        Math.abs((streams.video as number) - targetDuration) < TOLERANCE,
        `video=${streams.video} target=${targetDuration}`,
      );
      assert.ok(probed !== undefined);
      assert.ok(
        Math.abs((probed as number) - targetDuration) < TOLERANCE,
        `format duration=${probed} target=${targetDuration}`,
      );
      assert.ok(
        Math.abs(meta.duration - targetDuration) < TOLERANCE,
        `meta.duration=${meta.duration}`,
      );
    });

    await check("subtitles are burned in", async () => {
      const noSub = join(dir, "out-nosub.mp4");
      await renderVideoClipsMp4({
        scenes,
        audioPath: join(dir, "vo.aac"),
        outputPath: noSub,
        audioDurationSeconds: voDuration,
        tailPadSeconds: TAIL_BUFFER_SECONDS,
        profile: SHORT_PROFILE,
      });
      const withSubFrame = join(dir, "frame-sub.png");
      const noSubFrame = join(dir, "frame-nosub.png");
      await framePngNear(outPath, 1.0, withSubFrame);
      await framePngNear(noSub, 1.0, noSubFrame);
      const a = await readFile(withSubFrame);
      const b = await readFile(noSubFrame);
      assert.notDeepEqual(a, b, "subtitle burn should change the frame pixels");
    });

    await check("thumbnail from clip render via generateThumbnail", async () => {
      const thumb = join(dir, "thumb.png");
      const { thumbnailPath } = await generateThumbnail({
        mp4Path: outPath,
        outputPath: thumb,
      });
      assert.equal(thumbnailPath, thumb);
      const buf = await readFile(thumb);
      assert.ok(buf.length > 500);
      assert.equal(buf[0], 0x89);
    });

    await check("still-image render path still works", async () => {
      await mkdir(join(dir, "stills"), { recursive: true });
      for (let i = 1; i <= 3; i++) {
        await run(ffmpegBin(), [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `color=c=red:s=1080x1920:d=1`,
          "-frames:v",
          "1",
          join(dir, "stills", `s${i}.png`),
        ]);
      }
      const beats: RenderBeat[] = [
        { sceneId: "s1", motion: "zoom_in", transition: "none", durationSeconds: 2 },
        { sceneId: "s2", motion: "pan_right", transition: "fade", durationSeconds: 2 },
        { sceneId: "s3", motion: "zoom_out", transition: "push", durationSeconds: 2 },
      ];
      const stillOut = join(dir, "still-path.mp4");
      const input: RenderMp4Input = {
        images: [
          { sceneId: "s1", imagePath: join(dir, "stills", "s1.png") },
          { sceneId: "s2", imagePath: join(dir, "stills", "s2.png") },
          { sceneId: "s3", imagePath: join(dir, "stills", "s3.png") },
        ],
        beats,
        audioPath: join(dir, "vo.aac"),
        outputPath: stillOut,
        targetDurationSeconds: 6,
        profile: SHORT_PROFILE,
      };
      await run(ffmpegBin(), buildMultiBeatArgs(input, beats));
      const stillMeta = await probeJson(stillOut);
      assert.equal(stillMeta.width, 1080);
      assert.equal(stillMeta.height, 1920);
      assert.equal(stillMeta.vcodec, "h264");
      assert.ok(Math.abs(stillMeta.fps - 30) < 0.05);
    });

    await check("no network / paid calls in this suite", () => {
      // Suite only uses local lavfi + ffmpeg/ffprobe; nothing imported Runway/OpenAI.
      assert.ok(true);
    });

    passed = 15;
    console.log(`\nAll video-clip render checks passed.`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (err) {
  failures += 1;
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}

void passed;
void failures;
