/**
 * Editor Language — admin preference for Manual Creative Review.
 *
 * Not project language. Not browser locale.
 * Extensible: add codes to EDITOR_LANGUAGE_CODES + labels; migration check expands.
 */

export const EDITOR_LANGUAGE_CODES = ["en", "cs", "uk"] as const;
export type EditorLanguageCode = (typeof EDITOR_LANGUAGE_CODES)[number];

export const DEFAULT_EDITOR_LANGUAGE: EditorLanguageCode = "en";

const EDITOR_LANGUAGE_LABELS: Record<EditorLanguageCode, string> = {
  en: "English",
  cs: "Czech",
  uk: "Ukrainian",
};

/** Ordered registry for Settings UI and future languages. */
export const EDITOR_LANGUAGE_OPTIONS: ReadonlyArray<{
  code: EditorLanguageCode;
  label: string;
}> = EDITOR_LANGUAGE_CODES.map((code) => ({
  code,
  label: EDITOR_LANGUAGE_LABELS[code],
}));

export function isEditorLanguageCode(
  value: unknown,
): value is EditorLanguageCode {
  return (
    typeof value === "string" &&
    (EDITOR_LANGUAGE_CODES as readonly string[]).includes(value)
  );
}

export function parseEditorLanguage(
  value: unknown,
  fallback: EditorLanguageCode = DEFAULT_EDITOR_LANGUAGE,
): EditorLanguageCode {
  return isEditorLanguageCode(value) ? value : fallback;
}

export function editorLanguageLabel(code: EditorLanguageCode): string {
  return EDITOR_LANGUAGE_LABELS[code] ?? code;
}

/**
 * Human language name for Claude translation prompts.
 * Keep separate from UI labels so prompt wording can differ later.
 */
export function editorLanguagePromptName(code: EditorLanguageCode): string {
  return EDITOR_LANGUAGE_LABELS[code] ?? code;
}
