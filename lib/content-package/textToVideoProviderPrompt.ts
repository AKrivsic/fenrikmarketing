/**
 * Derives Runway-facing prompt text from editor-facing scene intent.
 * Not shown in Creative Review UI.
 */
export function composeTextToVideoProviderPrompt(args: {
  humanVisualIntent: string;
  energyMotion: string;
  sceneRole: "opening" | "body" | "closing";
}): string {
  const intent = args.humanVisualIntent.trim();
  const energy = args.energyMotion.trim() || "Natural marketing motion";
  const lines = [
    "Photoreal marketing video clip, vertical 9:16.",
    `Visual intent: ${intent}`,
    `Energy and motion: ${energy}`,
    args.sceneRole === "opening"
      ? "Opening beat: immediate visual hook, no on-image readable text."
      : args.sceneRole === "closing"
        ? "Closing beat: supportive CTA mood, no on-image readable text."
        : "Story beat: clear subject, no on-image readable text.",
    "No character dialogue, no lip-sync, no generated subtitles or logos in frame.",
    "No readable text in the video unless explicitly part of approved UI chrome.",
  ];
  return lines.join(" ");
}
