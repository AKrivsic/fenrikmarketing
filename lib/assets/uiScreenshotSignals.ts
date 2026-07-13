import type { ProductRole } from "@/lib/assets/productRole";

function haystack(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** True when metadata/text indicate a product UI / app / browser screenshot (not a lifestyle photo). */
export function isUiScreenshotContent(input: {
  productRole?: ProductRole | null;
  detectedContentType?: string | null;
  aiDescription?: string | null;
  title?: string | null;
  preferredPresentation?: string | null;
}): boolean {
  const role = input.productRole ?? null;
  if (
    role === "product_ui" ||
    role === "dashboard" ||
    role === "homepage_screenshot" ||
    role === "pricing_screenshot"
  ) {
    return true;
  }

  if (
    input.preferredPresentation === "laptop_screen" ||
    input.preferredPresentation === "desktop_monitor" ||
    input.preferredPresentation === "tablet_screen"
  ) {
    return true;
  }

  if (input.preferredPresentation === "phone_screen") {
    const hay = haystack([
      input.title,
      input.detectedContentType,
      input.aiDescription,
    ]);
    if (
      /\bscreenshot\b/.test(hay) ||
      /\b(mobile app|app screen|app ui|user interface|application interface|product ui)\b/.test(
        hay,
      )
    ) {
      return true;
    }
  }

  const hay = haystack([
    input.title,
    input.detectedContentType,
    input.aiDescription,
  ]);

  if (!hay.trim()) return false;

  if (/\b(lifestyle|portrait photo|headshot|founder|team photo|stock photo)\b/.test(hay)) {
    return false;
  }

  return (
    /\bscreenshot\b/.test(hay) ||
    /\b(app interface|application interface|product ui)\b/.test(hay) ||
    /\b(mobile app|app screen|app ui|phone screen|user interface|ui mockup)\b/.test(hay) ||
    /\b(dashboard|homepage|pricing page|web app)\b/.test(hay) ||
    (/\b(browser|saas|software)\b/.test(hay) && /\b(ui|screen|interface)\b/.test(hay))
  );
}

/** Portrait marketing / hero imagery that may use fullscreen vertical presentation. */
export function isPortraitMarketingPhoto(input: {
  productRole?: ProductRole | null;
  detectedContentType?: string | null;
  aiDescription?: string | null;
  title?: string | null;
}): boolean {
  if (isUiScreenshotContent(input)) return false;
  const role = input.productRole ?? null;
  if (role === "hero_image" || role === "founder_photo" || role === "decorative") {
    return true;
  }
  const hay = haystack([
    input.title,
    input.detectedContentType,
    input.aiDescription,
  ]);
  return (
    /\b(hero|banner|marketing|lifestyle|portrait photo|team photo|founder)\b/.test(hay) &&
    !/\bscreenshot\b/.test(hay)
  );
}
