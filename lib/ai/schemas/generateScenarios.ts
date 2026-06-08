import {
  vArray,
  vObject,
  vString,
  type Infer,
} from "@/lib/ai/validateAiOutput";

// Phase 2D — output schema for the scenario generation workflow. From the
// project's Product / Customer / Proof knowledge the model returns 5–10 concrete
// situations the customer faces. Each scenario is a single short sentence; the
// workflow caps the maximum at 10. A minimum of 1 keeps the output usable even
// when the model is conservative; the prompt asks for 5–10.
const scenarioSchema = vObject({
  text: vString({ minLength: 1 }),
});

export const generateScenariosSchema = vObject({
  scenarios: vArray(scenarioSchema, { min: 1 }),
});

export type GenerateScenariosOutput = Infer<typeof generateScenariosSchema>;
