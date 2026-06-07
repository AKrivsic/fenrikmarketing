import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client that uses the SERVICE ROLE key and therefore
// BYPASSES Row Level Security.
//
// Why this exists: every table is protected by RLS via owns_project(project_id),
// which resolves auth.uid() from the user's session cookies. Trusted automation
// callbacks (e.g. n8n) run with NO user session, so the cookie-bound
// createSupabaseServerClient() would have auth.uid() = NULL and every write
// would be rejected. This admin client is the intended, single entry point for
// those server-side writes.
//
// IMPORTANT
// - Use ONLY in trusted server-side code (route handlers / server modules)
//   that has already authenticated the caller by other means (e.g. the
//   x-n8n-secret header).
// - Because RLS is bypassed, the caller is responsible for scoping every query
//   to the correct project_id. There is no automatic tenant isolation here.
// - Never import this from client components or expose the key to the browser.

// Runtime guard: hard-fail if this module is ever evaluated in a browser bundle.
// The service role key is read from a non-NEXT_PUBLIC_ env var (so Next.js never
// inlines it client-side); this check is a defence-in-depth backstop.
if (typeof window !== "undefined") {
  throw new Error(
    "createSupabaseAdminClient is server-only and must not run in the browser",
  );
}

export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  // No session persistence / auto refresh: this client is stateless and
  // request-scoped, never tied to a user session.
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
