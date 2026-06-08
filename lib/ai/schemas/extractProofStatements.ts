import {
  vArray,
  vNumber,
  vObject,
  vString,
  type Infer,
} from "@/lib/ai/validateAiOutput";

// Phase 2C — output schema for the proof extraction workflow. From a single
// trust/proof asset's metadata the model returns 0–5 proof statements. The list
// MAY be empty (e.g. the asset turned out to carry no concrete proof), so no
// minimum is enforced; the workflow caps the maximum at 5.
const proofStatementSchema = vObject({
  text: vString({ minLength: 1 }),
  // Model self-reported confidence that this is a real, usable proof, 0..1.
  confidence: vNumber({ min: 0, max: 1 }),
});

export const extractProofStatementsSchema = vObject({
  statements: vArray(proofStatementSchema),
});

export type ExtractProofStatementsOutput = Infer<
  typeof extractProofStatementsSchema
>;
