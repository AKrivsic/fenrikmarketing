import type { Project } from "@/lib/supabase/types";
import { normalizePainPoints } from "@/lib/ai/prompts/context";

function blob(project: Project): string {
  const parts: string[] = [
    (project.type ?? "").toLowerCase(),
    ...(project.product_is ?? []),
    ...(project.product_strengths ?? []),
    ...normalizePainPoints(project),
  ];
  const audience = project.target_audience;
  if (audience && typeof audience === "object" && !Array.isArray(audience)) {
    const segments = (audience as { segments?: unknown }).segments;
    if (Array.isArray(segments)) {
      for (const s of segments) {
        if (typeof s === "string") parts.push(s);
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Product Brain hints for visual reasoning — constrain meaning, not scenery.
 * Do not force dashboards OR physical storefronts for digital products.
 */
export function productVisualWorldHints(project: Project): string[] {
  const text = blob(project);
  const hints: string[] = [];

  const add = (line: string) => {
    if (!hints.includes(line)) hints.push(line);
  };

  // Website / chatbot assistants — meaning is unanswered visitors, not retail or dashboards.
  if (
    /\b(chatbot|ai assistant|embed script|website\s+visitor|answers? visitor|24\/?7)\b/.test(
      text,
    ) ||
    (/\b(website|saas|software|platform)\b/.test(text) &&
      /\b(visitor|lead|after.?hours|unanswered|chat)\b/.test(text))
  ) {
    add(
      "Digital assistant world (meaning, not scenery): film unanswered visitors, people waiting for a reply, someone walking away, after-hours silence becoming answered — NOT automatic storefronts, NOT dashboards, NOT abstract boats/notebooks standing in for visitors.",
    );
  }

  if (/\b(student|teacher|school|exam|revision|study|flashcard|education|edtech|university|campus)\b/.test(text)) {
    add(
      "Education world: libraries, study corners, cafés, revision situations, commute moments — not corporate SaaS office tropes unless the beat requires it.",
    );
  }
  if (/\b(dental|dentist|clinic|patient|hygienist|medical)\b/.test(text)) {
    add(
      "Clinical care world: treatment rooms, reception, calm professional spaces, patient waiting moments — never generic startup desk stock.",
    );
  }
  if (/\b(restaurant|dining|chef|kitchen|hospitality|hotel|guest|menu)\b/.test(text)) {
    add(
      "Hospitality world: dining rooms, kitchens, service flow, empty tables, guest moments — warm operational situations.",
    );
  }
  if (/\b(law|legal|attorney|firm|compliance)\b/.test(text)) {
    add(
      "Professional services world: client meetings, waiting for answers, case conversations — formal but human situations.",
    );
  }
  if (/\b(fitness|gym|workout|trainer|health club)\b/.test(text)) {
    add(
      "Fitness world: training floor, equipment, movement, coaching moments — energetic physical situations.",
    );
  }
  if (/\b(mobile app|app store|ios|android|review|aso)\b/.test(text)) {
    add(
      "Mobile product world: on-the-go use situations, review moments — phones only when the beat needs them, not desk defaults.",
    );
  }
  if (
    /\b(developer|engineering|architecture|devops|saas|platform|api|code|sprint|backlog|blueprint|requirements)\b/.test(
      text,
    ) &&
    !/\b(chatbot|ai assistant|embed script|answers? visitor)\b/.test(text)
  ) {
    add(
      "Builder world: planning and shipping situations — standups, unfinished specs, blocked work — not sticky-note collage for its own sake, not only a solo founder at a laptop.",
    );
  }
  if (/\b(agency|consulting|marketing|client)\b/.test(text)) {
    add(
      "Agency world: client conversations, missed follow-ups, collaborative tension — situations first, workshop props only when they are part of the event.",
    );
  }

  if (hints.length === 0) {
    add(
      "Ground visuals in this product's real audience pain as a filmable situation — choose events people recognize, not generic tech stock and not abstract symbols that need a caption.",
    );
  }

  add(
    "Product Brain constrains MEANING (who hurts, what changed), not scenery. Do not force browser UI, dashboards, or physical stores unless that situation is truly strongest.",
  );

  return hints.slice(0, 6);
}
