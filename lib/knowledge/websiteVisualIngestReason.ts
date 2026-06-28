export function resolveWebsiteVisualIngestReason(args: {
  htmlCreated: number;
  captureSaved: number;
  hadPrioritizedCandidates: boolean;
  captureEnabled: boolean;
  captureSkippedReason?: string;
}): string | undefined {
  const total = args.htmlCreated + args.captureSaved;
  if (total > 0) return undefined;

  if (!args.hadPrioritizedCandidates) {
    if (!args.captureEnabled) return "no_candidates_component_capture_disabled";
    if (args.captureSkippedReason === "tier1_exists") {
      return "no_candidates_tier1_exists";
    }
    return "no_candidates_and_no_capture_assets";
  }

  return "none_saved";
}
