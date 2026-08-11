"use server";

import { revalidatePath } from "next/cache";
import {
  getAdminPreferences,
  setEditorLanguagePreference,
  type AdminPreferences,
} from "@/lib/admin/adminPreferences";
import {
  isEditorLanguageCode,
  type EditorLanguageCode,
} from "@/lib/admin/editorLanguage";

export type LoadAdminPreferencesResult =
  | { ok: true; preferences: AdminPreferences }
  | { ok: false; error: string };

export type SaveEditorLanguageResult =
  | { ok: true; preferences: AdminPreferences }
  | { ok: false; error: string };

export async function loadAdminPreferencesAction(): Promise<LoadAdminPreferencesResult> {
  try {
    const preferences = await getAdminPreferences();
    return { ok: true, preferences };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load admin preferences.";
    return { ok: false, error: message };
  }
}

export async function saveEditorLanguageAction(
  rawLanguage: string,
): Promise<SaveEditorLanguageResult> {
  if (!isEditorLanguageCode(rawLanguage)) {
    return {
      ok: false,
      error: "Unsupported editor language.",
    };
  }
  try {
    const preferences = await setEditorLanguagePreference({
      editorLanguage: rawLanguage as EditorLanguageCode,
    });
    revalidatePath("/settings");
    return { ok: true, preferences };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save editor language.";
    return { ok: false, error: message };
  }
}
