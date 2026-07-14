export const CREATIVE_IDENTITY_VERSION = "creative-identity@1" as const;

export type CreativeIdentityDimension =
  | "environment"
  | "mood"
  | "lighting"
  | "camera"
  | "composition"
  | "human_presence"
  | "color_feel";

export interface CreativeIdentity {
  version: typeof CREATIVE_IDENTITY_VERSION;
  environment: string;
  mood: string;
  lighting: string;
  camera: string;
  composition: string;
  human_presence: string;
  color_feel: string;
  /** Stable tuple for series de-duplication. */
  key: string;
  /** Dimension option ids (for logs / debugging). */
  option_ids: Record<CreativeIdentityDimension, string>;
}

export function creativeIdentityKey(identity: Pick<
  CreativeIdentity,
  | "environment"
  | "mood"
  | "lighting"
  | "camera"
  | "composition"
  | "human_presence"
  | "color_feel"
>): string {
  return [
    identity.environment,
    identity.mood,
    identity.lighting,
    identity.camera,
    identity.composition,
    identity.human_presence,
    identity.color_feel,
  ].join("|");
}
