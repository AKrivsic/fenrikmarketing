import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Project, ProjectInsert, ProjectUpdate } from "@/lib/supabase/types";

async function requireUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

export async function listProjects(): Promise<Project[]> {
  const supabase = await createSupabaseServerClient();
  // RLS already scopes rows to owner_id = auth.uid().
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return (data as Project) ?? null;
}

export async function createProject(input: ProjectInsert): Promise<Project> {
  const supabase = await createSupabaseServerClient();
  const ownerId = await requireUserId();

  // owner_id is forced to the authenticated user to satisfy the RLS
  // "projects owner insert" policy (owner_id = auth.uid()).
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, owner_id: ownerId })
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  projectId: string,
  input: ProjectUpdate,
): Promise<Project> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", projectId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}
