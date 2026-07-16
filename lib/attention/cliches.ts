/** Patterns that make an opening visually forgettable — soft reject unless truly strongest. */

export const OFFICE_CLICHE_PATTERNS: readonly RegExp[] = [
  /\bcalm\s+desk\b/i,
  /\bperson\s+(merely\s+)?sitting\s+at\s+(a\s+)?laptop\b/i,
  /\bstaring\s+at\s+(a\s+)?(laptop|screen|monitor)\b/i,
  /\bempty\s+(whiteboard|board|calendar)\b/i,
  /\blaptop\s+plus\s+coffee\b/i,
  /\blaptop\s+and\s+coffee\b/i,
  /\bcoffee\s+beside\s+(a\s+)?laptop\b/i,
  /\bpapers?\s+scattered\b/i,
  /\bsticky[- ]?notes?\s+(chaos|everywhere|scattered)\b/i,
  /\bgeneric\s+sticky[- ]?note\b/i,
  /\bnotebook\s+versus\s+paper\b/i,
  /\bnotebook\s+vs\.?\s+paper\b/i,
  /\bbusy\s+entrepreneur\b/i,
  /\bfaceless\s+person\b/i,
  /\blooking\s+at\s+(the\s+)?screen\b/i,
  /\bred\s+warning\s+(symbol|icon|sign)\b/i,
  /\bgeneric\s+(office|workspace)\b/i,
  /\bmodern\s+office\s+desk\b/i,
  /\bthinking\s+at\s+(a\s+)?desk\b/i,
  /\bcalm\s+workspace\b/i,
];

export const GENERIC_SETUP_OPENERS: readonly RegExp[] = [
  /^most\s+businesses\b/i,
  /^everyone\s+says\b/i,
  /^here'?s\s+what\s+nobody\s+tells\s+you\b/i,
  /^in\s+today'?s\s+world\b/i,
  /^did\s+you\s+know\b/i,
  /^let'?s\s+talk\s+about\b/i,
  /^many\s+people\s+struggle\b/i,
];

export function matchesOfficeCliche(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const re of OFFICE_CLICHE_PATTERNS) {
    if (re.test(t)) return re.source;
  }
  return null;
}

export function matchesGenericSetupOpener(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const re of GENERIC_SETUP_OPENERS) {
    if (re.test(t)) return re.source;
  }
  return null;
}

export function isNotebookVsPaperDilemma(text: string): boolean {
  const t = text.toLowerCase();
  return (
    (t.includes("notebook") && t.includes("paper")) ||
    (t.includes("notepad") && t.includes("paper")) ||
    /sticky[- ]?notes?/.test(t) && /laptop|desk/.test(t)
  );
}

export function isGenericOfficeHumor(text: string): boolean {
  const t = text.toLowerCase();
  const officeBits =
    /coffee|laptop|meeting that could.?ve been|inbox zero|slack ping|zoom fatigue/.
      test(t);
  const jokeBits = /joke|funny|hilarious|lol|haha/.test(t) || /humor/.test(t);
  return officeBits && (jokeBits || /entrepreneur|hustle|grind/.test(t));
}
