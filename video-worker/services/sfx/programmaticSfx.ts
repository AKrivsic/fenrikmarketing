import { writeFile } from "node:fs/promises";
import type { SfxCategory } from "@/lib/attention/types";

/** Max peak amplitude relative to Int16 full scale — keep well under voice. */
export const SFX_PEAK = 0.22;

const SAMPLE_RATE = 44100;

function writeWavPcm16(samples: Float32Array, sampleRate = SAMPLE_RATE): Buffer {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    buffer.writeInt16LE((s * 0x7fff) | 0, 44 + i * 2);
  }
  return buffer;
}

function envelope(t: number, attack: number, release: number, dur: number): number {
  if (t < attack) return t / attack;
  if (t > dur - release) return Math.max(0, (dur - t) / release);
  return 1;
}

function tone(
  durationSec: number,
  freq: number,
  peak = SFX_PEAK,
  opts?: { attack?: number; release?: number; noise?: number },
): Float32Array {
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  const attack = opts?.attack ?? 0.005;
  const release = opts?.release ?? 0.04;
  const noise = opts?.noise ?? 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, attack, release, durationSec);
    const sine = Math.sin(2 * Math.PI * freq * t);
    const nse = noise > 0 ? (Math.random() * 2 - 1) * noise : 0;
    out[i] = (sine * (1 - noise) + nse) * peak * env;
  }
  return out;
}

function whoosh(durationSec = 0.22, peak = SFX_PEAK * 0.85): Float32Array {
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.01, 0.08, durationSec);
    const freq = 400 + (1800 * t) / durationSec;
    const noise = Math.random() * 2 - 1;
    out[i] = (Math.sin(2 * Math.PI * freq * t) * 0.35 + noise * 0.65) * peak * env;
  }
  return out;
}

function silence(durationSec: number): Float32Array {
  return new Float32Array(Math.floor(durationSec * SAMPLE_RATE));
}

export function synthesizeSfxSamples(category: SfxCategory): Float32Array {
  switch (category) {
    case "impact":
      return tone(0.12, 90, SFX_PEAK, { attack: 0.001, release: 0.08, noise: 0.35 });
    case "click":
      return tone(0.04, 1800, SFX_PEAK * 0.7, { attack: 0.001, release: 0.02 });
    case "notification":
      return tone(0.16, 880, SFX_PEAK * 0.6, { attack: 0.005, release: 0.06 });
    case "swipe":
      return whoosh(0.18, SFX_PEAK * 0.7);
    case "paper_rip":
      return tone(0.2, 300, SFX_PEAK * 0.55, {
        attack: 0.002,
        release: 0.1,
        noise: 0.85,
      });
    case "glass_clink":
      return tone(0.18, 1400, SFX_PEAK * 0.55, { attack: 0.001, release: 0.12 });
    case "typing_stop":
      return tone(0.06, 600, SFX_PEAK * 0.45, { attack: 0.001, release: 0.03 });
    case "error_tone":
      return tone(0.2, 220, SFX_PEAK * 0.55, { attack: 0.01, release: 0.1 });
    case "whoosh":
      return whoosh();
    case "comedic_pop":
      return tone(0.09, 520, SFX_PEAK * 0.75, { attack: 0.001, release: 0.05 });
    case "silence_drop":
      return silence(0.08);
    case "door_close":
      return tone(0.15, 120, SFX_PEAK * 0.6, {
        attack: 0.002,
        release: 0.09,
        noise: 0.25,
      });
    case "cash_accent":
      return tone(0.14, 1200, SFX_PEAK * 0.5, { attack: 0.002, release: 0.08 });
    default:
      return tone(0.05, 1000, SFX_PEAK * 0.4);
  }
}

export async function writeProgrammaticSfxWav(args: {
  category: SfxCategory;
  outputPath: string;
}): Promise<{ path: string; durationMs: number }> {
  const samples = synthesizeSfxSamples(args.category);
  const wav = writeWavPcm16(samples);
  await writeFile(args.outputPath, wav);
  return {
    path: args.outputPath,
    durationMs: Math.round((samples.length / SAMPLE_RATE) * 1000),
  };
}

/** Clamp overlay gain so SFX never competes with voice. */
export function clampSfxGain(gain: unknown): number {
  const n = typeof gain === "number" ? gain : Number(gain);
  if (!Number.isFinite(n) || n <= 0) return 0.18;
  return Math.min(0.28, Math.max(0.05, n));
}
