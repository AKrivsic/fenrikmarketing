import { createImageSceneRenderer } from "@/lib/scene-types/renderers/imageSceneRenderer";
import { createChecklistSceneRenderer } from "@/lib/scene-types/renderers/checklistSceneRenderer";
import { createPhoneSceneRenderer } from "@/lib/scene-types/renderers/phoneSceneRenderer";
import { createQuoteSceneRenderer } from "@/lib/scene-types/renderers/quoteSceneRenderer";
import { createStatisticSceneRenderer } from "@/lib/scene-types/renderers/statisticSceneRenderer";
import { createCtaSceneRenderer } from "@/lib/scene-types/renderers/ctaSceneRenderer";
import { registerSceneRenderer } from "@/lib/scene-types/renderers/types";
import { prepareImageSceneRaster } from "@/video-worker/services/prepareImageSceneRaster";
import { prepareChecklistSceneRaster } from "@/video-worker/services/prepareChecklistSceneRaster";
import { preparePhoneSceneRaster } from "@/video-worker/services/preparePhoneSceneRaster";
import { prepareQuoteSceneRaster } from "@/video-worker/services/prepareQuoteSceneRaster";
import { prepareStatisticSceneRaster } from "@/video-worker/services/prepareStatisticSceneRaster";
import { prepareCtaSceneRaster } from "@/video-worker/services/prepareCtaSceneRaster";

let initialized = false;

export function ensureSceneRendererRegistry(): void {
  if (initialized) return;
  registerSceneRenderer(
    createImageSceneRenderer({ prepareRaster: prepareImageSceneRaster }),
  );
  registerSceneRenderer(
    createChecklistSceneRenderer({
      prepareRaster: prepareChecklistSceneRaster,
    }),
  );
  registerSceneRenderer(
    createPhoneSceneRenderer({
      prepareRaster: preparePhoneSceneRaster,
    }),
  );
  registerSceneRenderer(
    createQuoteSceneRenderer({
      prepareRaster: prepareQuoteSceneRaster,
    }),
  );
  registerSceneRenderer(
    createStatisticSceneRenderer({
      prepareRaster: prepareStatisticSceneRaster,
    }),
  );
  registerSceneRenderer(
    createCtaSceneRenderer({
      prepareRaster: prepareCtaSceneRaster,
    }),
  );
  initialized = true;
}
