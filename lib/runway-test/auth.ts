import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionCookie,
} from "@/lib/auth/admin-gate";

export async function requireAdminSession(): Promise<
  { ok: true } | { ok: false; status: 401; error: string }
> {
  const cookieStore = await cookies();
  const valid = await isValidAdminSessionCookie(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!valid) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
