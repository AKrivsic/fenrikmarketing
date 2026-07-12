import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";

export async function resolveImageBytes(
  imageBase64: string | undefined,
  imageUrl: string | undefined,
): Promise<Buffer> {
  if (imageBase64) {
    return Buffer.from(imageBase64, "base64");
  }
  if (imageUrl) {
    const res = await fetchWithRetry(
      imageUrl,
      { method: "GET" },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "image-download",
      },
    );
    if (!res.ok) {
      throw new Error(`failed to download generated image (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("image provider returned neither imageBase64 nor imageUrl");
}
