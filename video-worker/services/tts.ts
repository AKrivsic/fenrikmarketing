import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getSpeechProvider } from "@/lib/ai";

export interface GenerateVoiceoverInput {
  text: string;
}

export interface GenerateVoiceoverResult {
  audioPath: string;
  durationSeconds?: number;
}

function workerTempDir(): string {
  return process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp");
}

// Synthesizes voiceover audio via the shared OpenAI Speech provider (no duplicate
// TTS logic in the worker). Writes MP3 bytes to a temp file for downstream FFmpeg.
export async function generateVoiceover(
  input: GenerateVoiceoverInput,
): Promise<GenerateVoiceoverResult> {
  const text = input.text.trim();
  if (!text) {
    throw new Error("generateVoiceover: text is required");
  }

  const speech = getSpeechProvider();
  const result = await speech.synthesize({ text, format: "mp3" });

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const audioPath = join(dir, `voiceover-${randomUUID()}.mp3`);
  await writeFile(audioPath, Buffer.from(result.audioBase64, "base64"));

  return { audioPath };
}
