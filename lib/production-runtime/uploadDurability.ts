/**
 * Upload durability rules (Invariant 2).
 * Once artifacts are durably written, a failed completed-callback must not
 * downgrade the job to failed.
 */

export interface DurableArtifactFields {
  mp4_url: string;
  thumbnail_url?: string;
  subtitle_url?: string;
  render_spec?: Record<string, unknown>;
  debug?: Record<string, unknown>;
}

/** Pure: after successful upload + DB artifact persist, never send failed. */
export function shouldSendFailedCallbackAfterUpload(args: {
  artifactsPersisted: boolean;
  completedCallbackSucceeded: boolean;
}): boolean {
  if (args.artifactsPersisted) return false;
  if (args.completedCallbackSucceeded) return false;
  return true;
}

export function buildDurableArtifactOutput(
  fields: DurableArtifactFields,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    mp4_url: fields.mp4_url,
    artifacts_persisted_at: new Date().toISOString(),
  };
  if (fields.thumbnail_url) output.thumbnail_url = fields.thumbnail_url;
  if (fields.subtitle_url) output.subtitle_url = fields.subtitle_url;
  if (fields.render_spec) output.render_spec = fields.render_spec;
  if (fields.debug) output.debug = fields.debug;
  return output;
}
