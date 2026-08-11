/**
 * Admin preferences (singleton row id = "default").
 * Service-role only.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_EDITOR_LANGUAGE,
  parseEditorLanguage,
  type EditorLanguageCode,
} from "@/lib/admin/editorLanguage";

const PREFERENCES_ID = "default";

export interface AdminPreferences {
  editorLanguage: EditorLanguageCode;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getAdminPreferences(): Promise<AdminPreferences> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_preferences")
    .select("editor_language, updated_at, updated_by")
    .eq("id", PREFERENCES_ID)
    .maybeSingle();
  if (error) throw error;

  return {
    editorLanguage: parseEditorLanguage(
      data?.editor_language,
      DEFAULT_EDITOR_LANGUAGE,
    ),
    updatedAt: (data?.updated_at as string | null | undefined) ?? null,
    updatedBy: (data?.updated_by as string | null | undefined) ?? null,
  };
}

export async function getEditorLanguagePreference(): Promise<EditorLanguageCode> {
  const prefs = await getAdminPreferences();
  return prefs.editorLanguage;
}

export async function setEditorLanguagePreference(args: {
  editorLanguage: EditorLanguageCode;
  updatedBy?: string | null;
}): Promise<AdminPreferences> {
  const language = parseEditorLanguage(args.editorLanguage);
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("admin_preferences")
    .upsert(
      {
        id: PREFERENCES_ID,
        editor_language: language,
        updated_at: now,
        updated_by: args.updatedBy ?? null,
      },
      { onConflict: "id" },
    )
    .select("editor_language, updated_at, updated_by")
    .single();
  if (error) throw error;

  return {
    editorLanguage: parseEditorLanguage(
      data.editor_language,
      DEFAULT_EDITOR_LANGUAGE,
    ),
    updatedAt: (data.updated_at as string | null) ?? now,
    updatedBy: (data.updated_by as string | null) ?? null,
  };
}
