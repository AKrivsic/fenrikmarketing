"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  computeAdminSessionToken,
  getAdminDashboardPassword,
  sanitizeAdminRedirectPath,
} from "@/lib/auth/admin-gate";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function adminLoginAction(formData: FormData): Promise<AdminLoginResult> {
  const configured = getAdminDashboardPassword();
  if (!configured) {
    return {
      ok: false,
      error: "Admin dashboard password is not configured (ADMIN_DASHBOARD_PASSWORD).",
    };
  }

  const password = String(formData.get("password") ?? "");
  if (password !== configured) {
    return { ok: false, error: "Invalid password." };
  }

  const token = await computeAdminSessionToken(configured);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  const next = sanitizeAdminRedirectPath(String(formData.get("next") ?? ""));
  redirect(next);
}
