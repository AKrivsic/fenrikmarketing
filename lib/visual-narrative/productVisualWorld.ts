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
 * Product Brain hints for visual reasoning — category-appropriate worlds,
 * not generic founder-at-laptop defaults.
 */
export function productVisualWorldHints(project: Project): string[] {
  const text = blob(project);
  const hints: string[] = [];

  const add = (line: string) => {
    if (!hints.includes(line)) hints.push(line);
  };

  if (/\b(student|teacher|school|exam|revision|study|flashcard|education|edtech|university|campus)\b/.test(text)) {
    add(
      "Education world: libraries, study corners, cafés, desks with notes and cards, backpacks, commute moments — not corporate SaaS office tropes unless the beat requires it.",
    );
  }
  if (/\b(dental|dentist|clinic|patient|hygienist|medical)\b/.test(text)) {
    add(
      "Clinical care world: treatment rooms, reception, calm professional spaces, tools and materials — never generic startup desk stock.",
    );
  }
  if (/\b(restaurant|dining|chef|kitchen|hospitality|hotel|guest|menu)\b/.test(text)) {
    add(
      "Hospitality world: dining rooms, kitchens, service flow, guest moments, ingredients — warm operational environments.",
    );
  }
  if (/\b(law|legal|attorney|firm|compliance)\b/.test(text)) {
    add(
      "Professional services world: conference tables, case files, client meetings, structured documents as objects — formal but human.",
    );
  }
  if (/\b(fitness|gym|workout|trainer|health club)\b/.test(text)) {
    add(
      "Fitness world: training floor, equipment, movement, coaching moments — energetic physical spaces.",
    );
  }
  if (/\b(mobile app|app store|ios|android|review|aso)\b/.test(text)) {
    add(
      "Mobile product world: phones as props when needed, app context, on-the-go use — vary with object/process/review metaphors, not only desk shots.",
    );
  }
  if (/\b(developer|engineering|architecture|devops|saas|platform|api|code|sprint|backlog|blueprint|requirements)\b/.test(text)) {
    add(
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
    );
  }
  if (/\b(agency|consulting|marketing|client)\b/.test(text)) {
    add(
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables.",
    );
  }

  if (hints.length === 0) {
    add(
      "Ground visuals in this product's real audience and pain from PROJECT BRAIN — choose subjects and places that belong to this business, not generic tech stock.",
    );
  }

  return hints.slice(0, 5);
}
