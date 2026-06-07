import {
  vArray,
  vNonEmptyString,
  vObject,
  vOptional,
  vString,
  type Infer,
} from "@/lib/ai/validateAiOutput";

export const evergreenTopicItemSchema = vObject({
  title: vNonEmptyString(),
  angle: vNonEmptyString(),
  pillar: vNonEmptyString(),
  keywords: vArray(vString(), { min: 1 }),
  audience_stage: vOptional(vString()),
});

export const evergreenTopicsSchema = vObject({
  topics: vArray(evergreenTopicItemSchema, { min: 1 }),
});

export type EvergreenTopicsOutput = Infer<typeof evergreenTopicsSchema>;
export type EvergreenTopicItem = Infer<typeof evergreenTopicItemSchema>;
