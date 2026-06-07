import { z } from "zod";
import { sceneSchema } from "./sceneSchema";

// The render specification: everything the Video Worker needs to assemble one
// video. This is the eventual shape of a job's `input`. MVP scope: ordered
// scenes + the voiceover text. `subtitles` and `duration_seconds` are optional
// hints (the worker can derive duration from the scenes when omitted).
export const renderSchema = z.object({
  scenes: z.array(sceneSchema).min(1),
  voiceover_text: z.string().min(1),
  subtitles: z.string().optional(),
  duration_seconds: z.number().positive().optional(),
});

export type RenderSpec = z.infer<typeof renderSchema>;
