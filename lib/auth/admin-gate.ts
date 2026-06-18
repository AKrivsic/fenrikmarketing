export const ADMIN_SESSION_COOKIE = "fenrik_admin_session";

const SESSION_MESSAGE = "fenrik-admin-v1";

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function getAdminDashboardPassword(): string | null {
  const value = process.env.ADMIN_DASHBOARD_PASSWORD?.trim();
  return value && value.length > 0 ? value : null;
}

export async function computeAdminSessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(SESSION_MESSAGE),
  );
  return bufferToHex(sig);
}

export async function isValidAdminSessionCookie(
  cookieValue: string | undefined,
): Promise<boolean> {
  const password = getAdminDashboardPassword();
  if (!password || !cookieValue) return false;
  const expected = await computeAdminSessionToken(password);
  return timingSafeEqualString(cookieValue, expected);
}

const PROTECTED_PREFIXES = [
  "/admin",
  "/projects",
  "/review",
  "/review-queue",
  "/assets",
  "/history",
  "/settings",
  "/dashboard",
] as const;

export function isProtectedAdminPath(pathname: string): boolean {
  if (pathname === "/admin-login") return false;
  if (pathname === "/") return false;
  if (pathname === "/content-packages" || pathname.startsWith("/content-packages/")) {
    return false;
  }
  if (pathname.startsWith("/client-review")) return false;

  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function sanitizeAdminRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/admin/clients";
  }
  if (next.startsWith("/admin-login")) return "/admin/clients";
  return next;
}
