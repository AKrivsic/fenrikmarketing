// Shared language display labels for the review surfaces. Short codes feed the
// video pills / compact badges; full names label the translation blocks.

export const LANGUAGE_CODE_LABEL: Record<string, string> = {
  cs: "CS",
  en: "EN",
  de: "DE",
  sk: "SK",
  fr: "FR",
  es: "ES",
  it: "IT",
};

export const LANGUAGE_NAME: Record<string, string> = {
  cs: "Čeština",
  en: "English",
  de: "Deutsch",
  sk: "Slovenčina",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

export function languageCodeLabel(code: string): string {
  return LANGUAGE_CODE_LABEL[code] ?? code.toUpperCase();
}

export function languageName(code: string): string {
  return LANGUAGE_NAME[code] ?? code.toUpperCase();
}
