import {
  vBoolean,
  vEnum,
  vObject,
  vString,
  type Infer,
} from "@/lib/ai/validateAiOutput";

// Output schema for the asset analysis workflow. Every text field is required
// but MAY be an empty string (e.g. extracted_text when an image has no text),
// so the model always returns a complete, predictable object.
export const analyzeAssetSchema = vObject({
  ai_description: vString(),
  detected_content_type: vString(),
  suggested_usage: vString(),
  suggested_asset_class: vEnum(["static", "editable", "reference"] as const),
  extracted_text: vString(),
  trust_signal: vBoolean(),
});

export type AnalyzeAssetOutput = Infer<typeof analyzeAssetSchema>;
