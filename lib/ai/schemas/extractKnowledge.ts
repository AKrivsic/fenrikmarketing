import {
  vArray,
  vObject,
  vString,
  type Infer,
} from "@/lib/ai/validateAiOutput";

// Output schema for the Knowledge Model V2 extraction workflow. From a single
// page of website text the model proposes four cards. Every field is a list of
// short strings; lists MAY be empty when the source has nothing to say, so no
// minimum length is enforced (the UI lets the user fill gaps before approval).
const stringList = () => vArray(vString());

const productCardSchema = vObject({
  product_is: stringList(),
  product_is_not: stringList(),
  product_strengths: stringList(),
});

const customerCardSchema = vObject({
  target_audience: stringList(),
  pain_points: stringList(),
});

const voiceCardSchema = vObject({
  tone: stringList(),
  forbidden_claims: stringList(),
});

const proofCardSchema = vObject({
  statements: stringList(),
});

export const extractKnowledgeSchema = vObject({
  product: productCardSchema,
  customer: customerCardSchema,
  voice: voiceCardSchema,
  proof: proofCardSchema,
});

export type ExtractKnowledgeOutput = Infer<typeof extractKnowledgeSchema>;
