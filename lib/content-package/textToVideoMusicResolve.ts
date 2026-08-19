import type { TextToVideoMusicPlan } from "@/lib/content-package/textToVideoSoundPlan";
import { elevenLabsMusicAllowedForProduction } from "@/lib/elevenlabs/audioProductionConfig";

export class TextToVideoMusicResolveError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/**
 * Production rule for music.mode = auto:
 * - eleven_generated when licensed + paid confirm + budget gate passed upstream;
 * - otherwise fail closed with music_auto_unavailable (never silent none).
 */
export function resolveTextToVideoMusicForProduction(args: {
  music: TextToVideoMusicPlan;
  confirmPaidRun: boolean;
}): TextToVideoMusicPlan {
  if (args.music.mode !== "auto") {
    return args.music;
  }
  if (
    elevenLabsMusicAllowedForProduction({ confirmPaidRun: args.confirmPaidRun })
  ) {
    return { ...args.music, mode: "eleven_generated" };
  }
  throw new TextToVideoMusicResolveError("music_auto_unavailable");
}
