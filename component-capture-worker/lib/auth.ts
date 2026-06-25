import { timingSafeEqual } from "node:crypto";

export function isCaptureWorkerAuthorized(authHeader: string | undefined): boolean {
  const secret = process.env.COMPONENT_CAPTURE_SECRET?.trim();
  if (!secret) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;
  const provided = authHeader.slice("Bearer ".length).trim();
  if (!provided) return false;

  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(secret, "utf8");
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
