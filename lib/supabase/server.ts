import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Server-side Supabase client bound to the request cookies so that
// auth.uid() resolves to the signed-in user and RLS policies apply.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components the cookie store is read-only; the surrounding
        // middleware/route handler is responsible for persisting refreshed
        // sessions, so we ignore the write failure here.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // No-op: called from a context where cookies cannot be set.
        }
      },
    },
  });
}
